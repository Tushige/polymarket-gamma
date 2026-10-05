import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react'
import type { Game } from '../gamma/types'
import { createMarketSocket, type SocketStatus } from './marketSocket'
import { parseFrame } from './messages'
import { EMPTY_QUOTE, type Quote } from './quote'
import { createQuoteStore } from './quoteStore'
import {
  marketTotal,
  moneylineByTeam,
  moneylineTokenIds,
  overTokenIds,
  settledLabel,
  settledRange,
  winChance,
} from './summary'

/**
 * One connection for the page
 */
const { subscribe, unsubscribe, close, retry, onStatusChange, getStatus } =
  createMarketSocket({
    url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    onFrame,
    // After a gap, every number on screen must come from the new snapshot.
    onReconnect: () => quoteStore.clear(),
  })

export const retryConnection = retry

export function useSocketStatus(): SocketStatus {
  return useSyncExternalStore(onStatusChange, getStatus)
}

/**
 * The one store for the page. Subscribers hear about changes once per animation
 * frame: the screen cannot show more than that, and a burst of messages inside
 * one frame becomes one render instead of one render per message.
 */
export const quoteStore = createQuoteStore((flush) => {
  requestAnimationFrame(flush)
})

function onFrame(text: string) {
  quoteStore.apply(parseFrame(text))
}

export function useLiveQuotes(tokenIds: readonly string[]) {
  useEffect(() => {
    quoteStore.track(tokenIds)
    subscribe(tokenIds)
    return () => {
      quoteStore.untrack(tokenIds)
      unsubscribe(tokenIds)
    }
  }, [tokenIds])
}

export function useQuote(tokenId: string): Quote {
  const subscribe = useCallback(
    (onChange: () => void) => quoteStore.subscribe(tokenId, onChange),
    [tokenId],
  )
  return useSyncExternalStore(subscribe, () => quoteStore.get(tokenId))
}

/**
 * Re-renders when any of these tokens' quotes change, but only if `read`
 * returns a different plain value. A burst that leaves the value alone renders
 * nothing.
 */
function useTokensValue<T extends number | string | boolean | null>(
  tokenIds: readonly string[],
  read: () => T,
): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const stops = tokenIds.map((id) => quoteStore.subscribe(id, onChange))
      return () => {
        for (const stop of stops) stop()
      }
    },
    [tokenIds],
  )
  return useSyncExternalStore(subscribe, read)
}

/** The away team's chance to win as a whole percentage; null before a price. */
export function useWinChancePct(game: Game): number | null {
  const tokenIds = useMemo(() => moneylineTokenIds(game.rows), [game])
  const pair = useMemo(() => moneylineByTeam(game), [game])
  return useTokensValue(tokenIds, () => {
    if (pair === null) return null
    const chance = winChance(
      quoteStore.get(pair.away),
      quoteStore.get(pair.home),
    )
    return chance === null ? null : Math.round(chance * 100)
  })
}

/** The O/U line priced closest to even money. */
export function useMarketTotal(game: Game): number | null {
  const tokenIds = useMemo(() => overTokenIds(game.rows), [game])
  return useTokensValue(tokenIds, () => marketTotal(game.rows, quoteStore.get))
}

/** For a finished game: where the final total landed, e.g. "41.5–44.5". */
export function useSettledLabel(game: Game): string | null {
  const tokenIds = useMemo(() => overTokenIds(game.rows), [game])
  return useTokensValue(tokenIds, () => {
    const range = settledRange(game.rows, quoteStore.get)
    return range === null ? null : settledLabel(range)
  })
}

/** Whether any of these tokens has received its book yet. */
export function useHasBook(tokenIds: readonly string[]): boolean {
  return useTokensValue(tokenIds, () =>
    tokenIds.some((id) => quoteStore.get(id) !== EMPTY_QUOTE),
  )
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => close())
}
