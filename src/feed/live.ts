import { useEffect } from 'react'
import { createMarketSocket } from './marketSocket'
import { parseFrame } from './messages'

/**
 * One connection for the page
 */
const { subscribe, unsubscribe, close } = createMarketSocket({
  url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  onFrame,
})

function onFrame(text: string) {
  console.log(parseFrame(text))
}

export function useLiveQuotes(tokenIds: readonly string[]) {
  useEffect(() => {
    subscribe(tokenIds)
    return () => {
      unsubscribe(tokenIds)
    }
  }, [tokenIds])
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => close())
}
