import { describe, expect, test, vi } from 'vitest'
import type { FeedMessage } from './messages'
import { EMPTY_QUOTE } from './quote'
import { createQuoteStore } from './quoteStore'

const book = (
  tokenId: string,
  bestBid: number,
  bestAsk: number,
): FeedMessage => ({
  type: 'book',
  tokenId,
  bestBid,
  bestAsk,
  lastTrade: null,
  tickSize: '0.01',
})

const priceChange = (
  tokenId: string,
  bestBid: number,
  bestAsk: number,
): FeedMessage => ({ type: 'price_change', tokenId, bestBid, bestAsk })

test('a token with no data has the empty quote', () => {
  const store = createQuoteStore()
  store.track(['a'])

  expect(store.get('a')).toBe(EMPTY_QUOTE)
  expect(store.get('never-heard-of-it')).toBe(EMPTY_QUOTE)
})

test('applies a message to a tracked token', () => {
  const store = createQuoteStore()
  store.track(['a'])

  store.apply([book('a', 0.57, 0.58)])

  expect(store.get('a')).toMatchObject({ bestBid: 0.57, bestAsk: 0.58 })
})

test('ignores messages for tokens it is not tracking', () => {
  const store = createQuoteStore()
  store.track(['a'])

  store.apply([book('b', 0.1, 0.2)])

  expect(store.get('b')).toBe(EMPTY_QUOTE)
})

test('tells only the listeners of the token that changed', () => {
  const store = createQuoteStore()
  store.track(['a', 'b'])
  const onA = vi.fn()
  const onB = vi.fn()
  store.subscribe('a', onA)
  store.subscribe('b', onB)

  store.apply([book('a', 0.57, 0.58)])

  expect(onA).toHaveBeenCalledTimes(1)
  expect(onB).not.toHaveBeenCalled()
})

test('one frame that touches two tokens tells each of them once', () => {
  const store = createQuoteStore()
  store.track(['a', 'b'])
  const onA = vi.fn()
  const onB = vi.fn()
  store.subscribe('a', onA)
  store.subscribe('b', onB)

  store.apply([priceChange('a', 0.39, 0.4), priceChange('b', 0.6, 0.61)])

  expect(onA).toHaveBeenCalledTimes(1)
  expect(onB).toHaveBeenCalledTimes(1)
})

test('tells nobody when a message changes nothing', () => {
  const store = createQuoteStore()
  store.track(['a'])
  store.apply([book('a', 0.57, 0.58)])
  const onA = vi.fn()
  store.subscribe('a', onA)

  store.apply([priceChange('a', 0.57, 0.58)])

  expect(onA).not.toHaveBeenCalled()
})

test('returns the same object from get until the quote changes', () => {
  const store = createQuoteStore()
  store.track(['a'])
  store.apply([book('a', 0.57, 0.58)])

  const first = store.get('a')
  store.apply([priceChange('a', 0.57, 0.58)])
  expect(store.get('a')).toBe(first)

  store.apply([priceChange('a', 0.56, 0.58)])
  expect(store.get('a')).not.toBe(first)
})

test('stops telling a listener once it has unsubscribed', () => {
  const store = createQuoteStore()
  store.track(['a'])
  const onA = vi.fn()
  const unsubscribe = store.subscribe('a', onA)

  unsubscribe()
  store.apply([book('a', 0.57, 0.58)])

  expect(onA).not.toHaveBeenCalled()
})

test('unsubscribing one listener leaves the others in place', () => {
  const store = createQuoteStore()
  store.track(['a'])
  const first = vi.fn()
  const second = vi.fn()
  const unsubscribeFirst = store.subscribe('a', first)
  store.subscribe('a', second)

  unsubscribeFirst()
  unsubscribeFirst()
  store.apply([book('a', 0.57, 0.58)])

  expect(first).not.toHaveBeenCalled()
  expect(second).toHaveBeenCalledTimes(1)
})

test('forgets a token when it is untracked, and says so', () => {
  const store = createQuoteStore()
  store.track(['a'])
  store.apply([book('a', 0.57, 0.58)])
  const onA = vi.fn()
  store.subscribe('a', onA)

  store.untrack(['a'])

  expect(store.get('a')).toBe(EMPTY_QUOTE)
  expect(onA).toHaveBeenCalledTimes(1)

  store.apply([priceChange('a', 0.5, 0.6)])
  expect(store.get('a')).toBe(EMPTY_QUOTE)
})

test('tracking a token again does not wipe what it already holds', () => {
  const store = createQuoteStore()
  store.track(['a'])
  store.apply([book('a', 0.57, 0.58)])

  store.track(['a'])

  expect(store.get('a')).toMatchObject({ bestBid: 0.57 })
})

test('clear empties every tracked quote and tells their subscribers', () => {
  const store = createQuoteStore()
  store.track(['a', 'b', 'c'])
  store.apply([book('a', 0.57, 0.58), book('b', 0.1, 0.2)])
  const onA = vi.fn()
  const onC = vi.fn()
  store.subscribe('a', onA)
  store.subscribe('c', onC)

  store.clear()

  expect(store.get('a')).toBe(EMPTY_QUOTE)
  expect(store.get('b')).toBe(EMPTY_QUOTE)
  expect(onA).toHaveBeenCalledTimes(1)
  expect(onC).not.toHaveBeenCalled() // it was empty already

  store.apply([book('a', 0.5, 0.6)]) // still tracked
  expect(store.get('a')).toMatchObject({ bestBid: 0.5 })
})

describe('performance optimization', () => {
  test('when a scheduler is present, React renders are batched together per paint', () => {
    const pending: (() => void)[] = []
    const store = createQuoteStore((flush) => pending.push(flush))
    store.track(['a', 'b'])
    const onA = vi.fn()
    const onB = vi.fn()
    store.subscribe('a', onA)
    store.subscribe('b', onB)

    store.apply([book('a', 0.5, 0.52)])
    store.apply([priceChange('a', 0.51, 0.52)])
    store.apply([priceChange('a', 0.52, 0.53)])
    store.apply([book('b', 0.1, 0.2)])

    // The quotes are already current; only the telling is deferred.
    expect(store.get('a')).toMatchObject({ bestBid: 0.52 })
    expect(onA).not.toHaveBeenCalled()
    expect(pending).toHaveLength(1)

    pending[0]?.()

    expect(onA).toHaveBeenCalledTimes(1)
    expect(onB).toHaveBeenCalledTimes(1)
  })

  test('after a flush, the next change schedules a new one', () => {
    const pending: (() => void)[] = []
    const store = createQuoteStore((flush) => pending.push(flush))
    store.track(['a'])
    const onA = vi.fn()
    store.subscribe('a', onA)

    store.apply([book('a', 0.5, 0.52)])
    pending.shift()?.()
    store.apply([priceChange('a', 0.51, 0.52)])
    pending.shift()?.()

    expect(onA).toHaveBeenCalledTimes(2)
    expect(pending).toHaveLength(0)
  })
})

describe('last change', () => {
  test('records when a quote last changed, and only when it changed', () => {
    let clock = 1000
    const store = createQuoteStore(undefined, () => clock)
    store.track(['a', 'b'])
    expect(store.lastChange(['a', 'b'])).toBeNull()

    store.apply([book('a', 0.57, 0.58)])
    clock = 2000
    store.apply([priceChange('a', 0.57, 0.58)]) // changes nothing
    expect(store.lastChange(['a', 'b'])).toBe(1000)

    store.apply([book('b', 0.1, 0.2)])
    expect(store.lastChange(['a', 'b'])).toBe(2000)
    expect(store.lastChange(['a'])).toBe(1000)
  })

  test('forgets the time when a token is untracked or cleared', () => {
    const store = createQuoteStore(undefined, () => 5000)
    store.track(['a', 'b'])
    store.apply([book('a', 0.57, 0.58), book('b', 0.1, 0.2)])

    store.untrack(['a'])
    expect(store.lastChange(['a'])).toBeNull()

    store.clear()
    expect(store.lastChange(['b'])).toBeNull()
  })
})
