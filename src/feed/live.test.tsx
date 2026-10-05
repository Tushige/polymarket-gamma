// @vitest-environment happy-dom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import type { Game, Row } from '../gamma/types'
import { nextFrame } from '../test/dom'
import { quoteStore, useHasBook, useMarketTotal, useWinChancePct } from './live'
import type { FeedMessage } from './messages'

const rows: Row[] = [
  { tokenId: 'ml-a', question: 'A vs. B', outcome: 'A', line: null },
  { tokenId: 'ml-b', question: 'A vs. B', outcome: 'B', line: null },
  {
    tokenId: 'o40',
    question: 'A vs. B: O/U 40.5',
    outcome: 'Over',
    line: 40.5,
  },
  {
    tokenId: 'u40',
    question: 'A vs. B: O/U 40.5',
    outcome: 'Under',
    line: 40.5,
  },
  {
    tokenId: 'o43',
    question: 'A vs. B: O/U 43.5',
    outcome: 'Over',
    line: 43.5,
  },
  {
    tokenId: 'u43',
    question: 'A vs. B: O/U 43.5',
    outcome: 'Under',
    line: 43.5,
  },
]
const game: Game = {
  id: '1',
  slug: 'nfl-a-b-2026-10-02',
  title: 'A vs. B',
  rows,
  tokenIds: rows.map((row) => row.tokenId),
  inactiveMarketCount: 0,
  startTime: null,
  status: 'PENDING',
  eventWeek: null,
  away: null,
  home: null,
}

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

// The store is the page's singleton: unmount the hooks and empty it between tests.
afterEach(() => {
  cleanup()
  quoteStore.clear()
})

test('useMarketTotal re-renders only when the nearest-to-even line changes', async () => {
  quoteStore.track(game.tokenIds)
  let renders = 0
  const { result } = renderHook(() => {
    renders += 1
    return useMarketTotal(game)
  })
  expect(result.current).toBeNull()

  quoteStore.apply([book('o40', 0.51, 0.53), book('o43', 0.3, 0.32)])
  await nextFrame()
  expect(result.current).toBe(40.5)

  renders = 0
  quoteStore.apply([book('o43', 0.31, 0.33)])
  await nextFrame()
  expect(result.current).toBe(40.5)
  expect(renders).toBe(0)
})

test('useWinChancePct is a whole percentage from the moneyline', async () => {
  quoteStore.track(game.tokenIds)
  const { result } = renderHook(() => useWinChancePct(game))

  // Mids 0.61 and 0.39: 0.61 / (0.61 + 0.39) = 61 %.
  quoteStore.apply([book('ml-a', 0.6, 0.62), book('ml-b', 0.38, 0.4)])
  await nextFrame()

  expect(result.current).toBe(61)
})

test('useWinChancePct follows the team names, not the order of the outcomes', async () => {
  const reversed: Row[] = [
    { tokenId: 'rv-b', question: 'A vs. B', outcome: 'B', line: null },
    { tokenId: 'rv-a', question: 'A vs. B', outcome: 'A', line: null },
  ]
  const swapped: Game = {
    ...game,
    id: '2',
    rows: reversed,
    tokenIds: reversed.map((row) => row.tokenId),
  }
  quoteStore.track(swapped.tokenIds)
  const { result } = renderHook(() => useWinChancePct(swapped))

  quoteStore.apply([book('rv-a', 0.6, 0.62), book('rv-b', 0.38, 0.4)])
  await nextFrame()

  // Team A (away, first in the title) is the 61 % side, wherever Gamma lists it.
  expect(result.current).toBe(61)
})

test('useHasBook turns true when the first book lands', async () => {
  const ids = ['hb-a', 'hb-b']
  quoteStore.track(ids)
  const { result } = renderHook(() => useHasBook(ids))
  expect(result.current).toBe(false)

  quoteStore.apply([book('hb-a', 0.5, 0.52)])
  await nextFrame()

  expect(result.current).toBe(true)
})
