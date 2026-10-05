import type { FeedMessage } from './messages.ts'
import { applyMessage, EMPTY_QUOTE, type Quote } from './quote.ts'

export type Schedule = (flush: () => void) => void

type Listener = () => void

export interface QuoteStore {
  track(tokenIds: readonly string[]): void
  untrack(tokenIds: readonly string[]): void
  apply(messages: FeedMessage[]): void
  get(tokenId: string): Quote
  subscribe(tokenId: string, listener: Listener): () => void
  /** Reset every tracked quote to empty, and tell their subscribers. */
  clear(): void
}

export function createQuoteStore(schedule: Schedule = (flush) => flush()): QuoteStore {
  const quotes = new Map<string, Quote>()
  const listeners = new Map<string, Set<Listener>>()

  /**
   * Keeps track of tokens whose quote changed since subscribers were last told
   */
  const changedTokenIds = new Set<string>()
  let flushScheduled = false

  function flush() {
    flushScheduled = false
    const tokenIds = [...changedTokenIds]
    changedTokenIds.clear()
    for (const tokenId of tokenIds) {
      const tokenListener = listeners.get(tokenId)
      if (tokenListener === undefined) continue
      for (const listener of tokenListener) listener()
    }
  }

  function markChanged(tokenId: string) {
    changedTokenIds.add(tokenId)
    if (flushScheduled) return
    flushScheduled = true
    schedule(flush)
  }

  return {
    track(tokenIds) {
      for (const id of tokenIds) {
        if (!quotes.has(id)) quotes.set(id, EMPTY_QUOTE)
      }
    },

    untrack(tokenIds) {
      for (const id of tokenIds) {
        const previous = quotes.get(id)
        quotes.delete(id)
        if (previous !== undefined && previous !== EMPTY_QUOTE) markChanged(id)
      }
    },
    apply(messages) {
      for (const message of messages) {
        const current = quotes.get(message.tokenId)
        // encountered an untracked tokenId so we skip it
        if (current === undefined) continue

        const updated = applyMessage(current, message)
        if (updated === current) continue

        quotes.set(message.tokenId, updated)
        markChanged(message.tokenId)
      }
    },
    get(tokenId) {
      return quotes.get(tokenId) ?? EMPTY_QUOTE
    },
    subscribe(tokenId, listener) {
      const tokenListeners = listeners.get(tokenId) ?? new Set<Listener>()
      listeners.set(tokenId, tokenListeners)
      tokenListeners.add(listener)

      return () => {
        // cleanup func
        tokenListeners.delete(listener)
        if (
          tokenListeners.size === 0 &&
          listeners.get(tokenId) === tokenListeners // this check ensures that a stale cleanup will not delete newer listeners.
        ) {
          listeners.delete(tokenId)
        }
      }
    },
    clear() {
      for (const [id, quote] of quotes) {
        if (quote === EMPTY_QUOTE) continue
        quotes.set(id, EMPTY_QUOTE)
        markChanged(id)
      }
    },
  }
}