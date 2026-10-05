import { describe, expect, test } from 'vitest'
import type { FeedMessage } from './messages'
import { applyMessage, EMPTY_QUOTE, type Quote } from './quote'

const tokenId = 'token-1'

const seed: Quote = {
  bestBid: 0.57,
  bestAsk: 0.58,
  lastTrade: 0.42,
  tickSize: '0.01',
}

describe('applyMessage: Book', () => {
  test('the first book fills an empty quote', () => {
    const book: FeedMessage = {
      type: 'book',
      tokenId,
      bestBid: 0.57,
      bestAsk: 0.58,
      lastTrade: 0.42,
      tickSize: '0.01',
    }

    expect(applyMessage(EMPTY_QUOTE, book)).toEqual(seed)
  })

  test('a later book updates bid and ask but keeps last trade and tick size', () => {
    const laterBook: FeedMessage = {
      type: 'book',
      tokenId,
      bestBid: 0.55,
      bestAsk: 0.56,
      lastTrade: null,
      tickSize: null,
    }

    expect(applyMessage(seed, laterBook)).toEqual({
      bestBid: 0.55,
      bestAsk: 0.56,
      lastTrade: 0.42,
      tickSize: '0.01',
    })
  })
  test('returns the same object when nothing changed', () => {
    const duplicate: FeedMessage = {
      type: 'tick_size_change',
      tokenId,
      tickSize: '0.01',
    }
    const agreeingBook: FeedMessage = {
      type: 'book',
      tokenId,
      bestBid: 0.57,
      bestAsk: 0.58,
      lastTrade: null,
      tickSize: null,
    }

    expect(applyMessage(seed, duplicate)).toBe(seed)
    expect(applyMessage(seed, agreeingBook)).toBe(seed)
  })

  test('applyMessage is immutable and creates a new object when something changed', () => {
    const trade: FeedMessage = {
      type: 'last_trade_price',
      tokenId,
      price: 0.58,
    }

    const updated = applyMessage(seed, trade)

    expect(updated).not.toBe(seed)
    expect(seed.lastTrade).toBe(0.42)
  })
})

describe('applyMessage: Price Change', () => {
  test('a price change only changes best bid and ask', () => {
    const change: FeedMessage = {
      type: 'price_change',
      tokenId,
      bestBid: 0.56,
      bestAsk: 0.59,
    }
    expect(applyMessage(seed, change)).toEqual({
      bestBid: 0.56,
      bestAsk: 0.59,
      lastTrade: 0.42,
      tickSize: '0.01',
    })
  })
  test('a price change can set null value for ask', () => {
    const change: FeedMessage = {
      type: 'price_change',
      tokenId,
      bestBid: 0.57,
      bestAsk: null,
    }
    expect(applyMessage(seed, change).bestAsk).toBeNull()
  })
})

describe('applyMessage: Last Trade Price', () => {
  test('a trade replaces the last traded price', () => {
    const trade: FeedMessage = {
      type: 'last_trade_price',
      tokenId,
      price: 0.58,
    }
    expect(applyMessage(seed, trade)).toEqual({ ...seed, lastTrade: 0.58 })
  })
})

describe('applyMessage: tickSize', () => {
  test('a tick size change replaces the tick size', () => {
    const change: FeedMessage = {
      type: 'tick_size_change',
      tokenId,
      tickSize: '0.001',
    }
    expect(applyMessage(seed, change)).toEqual({ ...seed, tickSize: '0.001' })
  })
})
