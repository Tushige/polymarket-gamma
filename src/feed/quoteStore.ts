import type { FeedMessage } from './messages.ts'
import { applyMessage, EMPTY_QUOTE, type Quote } from './quote.ts'

type Listener = () => void

export interface QuoteStore {
  track(tokenIds: readonly string[]): void
  untrack(tokenIds: readonly string[]): void
  apply(messages: FeedMessage[]): void
  get(tokenId: string): Quote
  subscribe(tokenId: string, listener: Listener): () => void
}

export function createQuoteStore(): QuoteStore {
  const quotes = new Map<string, Quote>()
  const listeners = new Map<string, Set<Listener>>()

  function notify(tokenId: string) {
    const tokenListeners = listeners.get(tokenId)
    if (tokenListeners === undefined) return
    for (const listener of tokenListeners) listener()
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
        if (previous !== undefined && previous !== EMPTY_QUOTE) notify(id)
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
        notify(message.tokenId)
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
  }
}
