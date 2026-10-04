import { useEffect } from 'react'
import { createMarketSocket } from './marketSocket'

export function useLiveQuotes(tokenIds: readonly string[]) {
  const { subscribe, unsubscribe, close } = createMarketSocket({
    url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    onFrame,
  })

  function onFrame(data: string) {
    console.log(data.slice(200))
  }

  useEffect(() => {
    console.log('Live subs')
    subscribe(tokenIds)
    return () => {
      console.log('Live unsub')
      unsubscribe(tokenIds)
      close()
    }
  }, [tokenIds, subscribe, unsubscribe, close])
}
