import { describe, expect, test } from 'vitest'
import { ROWS } from '../test/fixtures'
import { EMPTY_QUOTE, type Quote } from './quote'
import {
  marketTotal,
  mid,
  moneylineTokenIds,
  overTokenIds,
  settledLabel,
  settledRange,
  winChance,
} from './summary'

const quote = (bestBid: number | null, bestAsk: number | null): Quote => ({
  bestBid,
  bestAsk,
  lastTrade: null,
  tickSize: '0.01',
})
const quotes = (map: Record<string, Quote>) => (tokenId: string) =>
  map[tokenId] ?? EMPTY_QUOTE

describe('mid', () => {
  test('is halfway between bid and ask, or the side that exists', () => {
    expect(mid(quote(0.4, 0.6))).toBeCloseTo(0.5)
    expect(mid(quote(0.4, null))).toBe(0.4)
    expect(mid(quote(null, 0.6))).toBe(0.6)
    expect(mid(quote(null, null))).toBeNull()
  })
})

describe('winChance', () => {
  test('normalises the two moneyline mids so they add up to one', () => {
    expect(winChance(quote(0.57, 0.58), quote(0.42, 0.43))).toBeCloseTo(0.575)
  })

  test('uses one side when only one has a price', () => {
    expect(winChance(quote(0.6, null), EMPTY_QUOTE)).toBe(0.6)
    expect(winChance(EMPTY_QUOTE, quote(0.3, 0.3))).toBeCloseTo(0.7)
  })

  test('is null before any price', () => {
    expect(winChance(EMPTY_QUOTE, EMPTY_QUOTE)).toBeNull()
  })
})

test('picks the moneyline and the Over tokens', () => {
  expect(moneylineTokenIds(ROWS)).toEqual(['pit', 'cle'])
  expect(overTokenIds(ROWS)).toEqual(['o38', 'o41', 'o44'])
})

describe('marketTotal', () => {
  test('is the Over line priced closest to even money', () => {
    const getQuote = quotes({
      o38: quote(0.69, 0.71),
      o41: quote(0.51, 0.53),
      o44: quote(0.29, 0.31),
    })
    expect(marketTotal(ROWS, getQuote)).toBe(41.5)
  })

  test('is null with no priced totals, and with no totals at all', () => {
    expect(marketTotal(ROWS, quotes({}))).toBeNull()
    expect(marketTotal(ROWS.slice(0, 2), quotes({}))).toBeNull()
  })
})

describe('settledRange', () => {
  test('brackets the final total between the last Over that won and the first that lost', () => {
    const getQuote = quotes({
      o38: quote(0.999, null),
      o41: quote(0.999, null),
      o44: quote(null, 0.001),
    })
    const range = settledRange(ROWS, getQuote)
    expect(range).toEqual([41.5, 44.5])
    expect(range && settledLabel(range)).toBe('41.5–44.5')
  })

  test('marks an open end, and is null with nothing settled', () => {
    expect(settledLabel([null, 38.5])).toBe('…–38.5')
    expect(settledRange(ROWS, quotes({}))).toBeNull()
  })
})
