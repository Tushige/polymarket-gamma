import { describe, expect, test } from 'vitest'
import frames from './fixtures/frames.json'
import { parseFrame, toPrice } from './messages.ts'

const STEELERS =
  '114452029473938322994940072047457517711080146350796218905893406566691475251935'
const OVER_35_5 =
  '14406252468675637995484652746383443692850656990659786881904072329442202240687'
const UNDER_35_5 =
  '84307755638066799103480305147540561968917649522100926587614127752345009697694'
const OVER_41_5 =
  '86916136913826813413577994026110161777233168036380019898410911539378647262079'
const UNDER_64_5 =
  '48926181173262267856076459559207402850137350006945175603280678304730648117194'

/** The socket delivers text. The fixture holds parsed JSON, so turn it back. */
const asFrame = (value: unknown) => JSON.stringify(value)

function bookFor(tokenId: string) {
  const messages = parseFrame(asFrame(frames.snapshot))
  return messages.find((message) => message.tokenId === tokenId)
}

describe('toPrice', () => {
  test('reads a price correctly', () => {
    expect(toPrice('0.57')).toBe(0.57)
    expect(toPrice('0.001')).toBe(0.001)
  })

  test('no price produces a null result', () => {
    expect(toPrice('')).toBeNull()
    expect(toPrice('0')).toBeNull()
    expect(toPrice('1')).toBeNull()
  })

  test('invalid price formats produce a null result', () => {
    expect(toPrice('abc')).toBeNull()
    expect(toPrice(undefined)).toBeNull()
    expect(toPrice(0.57)).toBeNull()
  })
})

describe('parseFrame: the snapshot', () => {
  test('is an array, and gives one book message per token', () => {
    const messages = parseFrame(asFrame(frames.snapshot))

    expect(messages).toHaveLength(12)
    expect(messages.every((message) => message.type === 'book')).toBe(true)
  })

  test('takes the highest bid and the lowest ask, not the first of each', () => {
    const raw = frames.snapshot.find((book) => book.asset_id === STEELERS)
    expect(raw?.bids[0]?.price).toBe('0.01')
    expect(raw?.asks[0]?.price).toBe('0.99')

    expect(bookFor(STEELERS)).toMatchObject({ bestBid: 0.57, bestAsk: 0.58 })
  })

  test('carries the last trade and the tick size', () => {
    expect(bookFor(STEELERS)).toMatchObject({
      lastTrade: 0.42,
      tickSize: '0.01',
    })
  })

  test('has no last trade for a token that never traded', () => {
    const raw = frames.snapshot.find((book) => book.asset_id === OVER_41_5)
    expect(raw?.last_trade_price).toBe('')

    expect(bookFor(OVER_41_5)).toMatchObject({ lastTrade: null })
  })

  test('keeps three decimals on a market that ticks in thousandths', () => {
    expect(bookFor(UNDER_64_5)).toMatchObject({
      bestBid: 0.866,
      bestAsk: 0.99,
      tickSize: '0.001',
    })
  })

  test('has no best bid or ask when the book is empty', () => {
    const [message] = parseFrame(asFrame([frames.emptyBook]))

    expect(message).toMatchObject({ bestBid: null, bestAsk: null })
  })
})

describe('parseFrame: messages after the snapshot', () => {
  test('a later book is one object, without last trade or tick size', () => {
    expect(frames.laterBook).not.toHaveProperty('tick_size')
    expect(frames.laterBook).not.toHaveProperty('last_trade_price')

    expect(parseFrame(asFrame(frames.laterBook))).toEqual([
      {
        type: 'book',
        tokenId: frames.laterBook.asset_id,
        bestBid: 0.5,
        bestAsk: 0.52,
        lastTrade: null,
        tickSize: null,
      },
    ])
  })
})

describe('parseFrame: everything else', () => {
  test('plain text from the server gives nothing, and does not throw', () => {
    expect(parseFrame('PONG')).toEqual([])
    expect(parseFrame('NO NEW ASSETS')).toEqual([])
    expect(parseFrame('INVALID OPERATION')).toEqual([])
    expect(parseFrame('')).toEqual([])
  })

  test('JSON it does not recognise gives nothing', () => {
    expect(parseFrame('{"event_type":"new_market","asset_id":"1"}')).toEqual([])
    expect(parseFrame('{"event_type":"book"}')).toEqual([])
    expect(parseFrame('[1, null, "book"]')).toEqual([])
    expect(parseFrame('42')).toEqual([])
  })
})

describe('parseFrame: price_change', () => {
  test('a price change gives one message per token, from best_bid and best_ask', () => {
    expect(parseFrame(asFrame(frames.priceChange))).toEqual([
      {
        type: 'price_change',
        tokenId: UNDER_35_5,
        bestBid: 0.39,
        bestAsk: 0.4,
      },
      { type: 'price_change', tokenId: OVER_35_5, bestBid: 0.6, bestAsk: 0.61 },
    ])
  })

  test('an empty side arrives as "0" or "1" and becomes null', () => {
    const [first, second] = parseFrame(asFrame(frames.priceChangeEmptySide))

    expect(first).toMatchObject({ bestBid: 0.999, bestAsk: null })
    expect(second).toMatchObject({ bestBid: null, bestAsk: 0.001 })
  })
})

describe('parseFrame: last_trade_price', () => {
  test('a trade gives the price it happened at', () => {
    expect(parseFrame(asFrame(frames.lastTradePrice))).toEqual([
      {
        type: 'last_trade_price',
        tokenId: frames.lastTradePrice.asset_id,
        price: 0.002,
      },
    ])
  })
})

describe('parseFrame: tick_size_change', () => {
  test('a tick size change gives the new tick size', () => {
    expect(parseFrame(asFrame(frames.tickSizeChange))).toEqual([
      {
        type: 'tick_size_change',
        tokenId: frames.tickSizeChange.asset_id,
        tickSize: '0.001',
      },
    ])
  })
})

describe('parseFrame: a message missing a field is dropped, not applied', () => {
  test('a price change without both sides is dropped; its valid sibling is kept', () => {
    const frame = {
      event_type: 'price_change',
      price_changes: [
        { asset_id: 'x', best_bid: '0.5' },
        { asset_id: 'y', best_bid: '0.5', best_ask: '0.52' },
      ],
    }

    expect(parseFrame(asFrame(frame))).toEqual([
      { type: 'price_change', tokenId: 'y', bestBid: 0.5, bestAsk: 0.52 },
    ])
  })

  test('a book without both sides is not a book', () => {
    const frame = { event_type: 'book', asset_id: 'x', bids: [] }

    expect(parseFrame(asFrame(frame))).toEqual([])
  })

  test('a tick size that is not a price step is ignored', () => {
    const change = {
      event_type: 'tick_size_change',
      asset_id: 'x',
      new_tick_size: 'abc',
    }
    const book = { ...frames.emptyBook, tick_size: '' }

    expect(parseFrame(asFrame(change))).toEqual([])
    expect(parseFrame(asFrame(book))).toMatchObject([{ tickSize: null }])
  })
})
