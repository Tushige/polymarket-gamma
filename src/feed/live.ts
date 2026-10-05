import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { createMarketSocket, type SocketStatus } from './marketSocket'
import { parseFrame } from './messages'
import { createQuoteStore } from './quoteStore'
import type { Quote } from './quote'

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
    subscribe(tokenIds)
    quoteStore.track(tokenIds)
    return () => {
      unsubscribe(tokenIds)
      quoteStore.untrack(tokenIds)
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

if (import.meta.hot) {
  import.meta.hot.dispose(() => close())
}
