import type { FeedMessage } from './messages'

export interface Quote {
  bestBid: number | null
  bestAsk: number | null
  lastTrade: number | null
  tickSize: string | null
}

export const EMPTY_QUOTE = Object.freeze({
  bestBid: null,
  bestAsk: null,
  lastTrade: null,
  tickSize: null,
})

const QUOTE_KEYS = Object.keys(EMPTY_QUOTE) as (keyof Quote)[]

/**
 *
 * @param prevQuote - the current quote
 * @param message the message from the feed API
 * @returns the new quote after applying the message
 */
function nextQuote(prevQuote: Quote, message: FeedMessage): Quote {
  switch (message.type) {
    case 'book':
      return {
        bestBid: message.bestBid,
        bestAsk: message.bestAsk,
        lastTrade: message.lastTrade ?? prevQuote.lastTrade,
        tickSize: message.tickSize ?? prevQuote.tickSize,
      }
    case 'price_change':
      return {
        ...prevQuote,
        bestBid: message.bestBid,
        bestAsk: message.bestAsk,
      }
    case 'last_trade_price':
      return { ...prevQuote, lastTrade: message.price }
    case 'tick_size_change':
      return { ...prevQuote, tickSize: message.tickSize }
  }
}

function isSame(a: Quote, b: Quote): boolean {
  return QUOTE_KEYS.every((key) => a[key] === b[key])
}

/**
 *
 * @param prevQuote the current quote
 * @param message the message from the feed API
 * @returns the same quote object if applying message didn't result in a change. Otherwise, returns the new updated quote
 */
export function applyMessage(prevQuote: Quote, message: FeedMessage): Quote {
  const updated = nextQuote(prevQuote, message)
  return isSame(prevQuote, updated) ? prevQuote : updated
}
