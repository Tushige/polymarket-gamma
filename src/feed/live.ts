import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { createMarketSocket } from './marketSocket'
import { parseFrame } from './messages'
import { createQuoteStore } from './quoteStore'
import type { Quote } from './quote'

/**
 * One connection for the page
 */
const { subscribe, unsubscribe, close } = createMarketSocket({
  url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  onFrame,
})

const quoteStore = createQuoteStore()

function onFrame(text: string) {
  quoteStore.apply(parseFrame(text))
  console.log(parseFrame(text))
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
