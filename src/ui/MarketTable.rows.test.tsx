// @vitest-environment happy-dom
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeAll, expect, test, vi } from 'vitest'
import { quoteStore } from '../feed/live'
import type { FeedMessage } from '../feed/messages'
import type { Game, Row } from '../gamma/types'
import { nextFrame, stubElementAnimate } from '../test/dom'
import { MarketTable } from './MarketTable'

/** How many times each row has rendered: one useQuote call per row render. */
const renders = vi.hoisted(() => ({}) as Record<string, number>)

vi.mock('../feed/live', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../feed/live')>()
  return {
    ...actual,
    // No socket in a test: the tokens are tracked by hand below.
    useLiveQuotes: () => {},
    useQuote: (tokenId: string) => {
      renders[tokenId] = (renders[tokenId] ?? 0) + 1
      return actual.useQuote(tokenId)
    },
  }
})

beforeAll(stubElementAnimate)

afterEach(() => {
  cleanup()
  quoteStore.clear()
})

const TITLE = 'A vs. B'
const total = (tokenId: string, outcome: string, line: number): Row => ({
  tokenId,
  outcome,
  line,
  question: `${TITLE}: O/U ${line}`,
})
const rows: Row[] = [
  { tokenId: 'ma', question: TITLE, outcome: 'A', line: null },
  { tokenId: 'mb', question: TITLE, outcome: 'B', line: null },
  total('o38', 'Over', 38.5),
  total('u38', 'Under', 38.5),
  total('o41', 'Over', 41.5),
  total('u41', 'Under', 41.5),
  total('o44', 'Over', 44.5),
  total('u44', 'Under', 44.5),
]
const game: Game = {
  id: 'g',
  slug: 'nfl-a-b-2026-10-02',
  title: TITLE,
  rows,
  tokenIds: rows.map((row) => row.tokenId),
  inactiveMarketCount: 0,
  startTime: null,
  status: 'PENDING',
  eventWeek: null,
  away: null,
  home: null,
}

const book = (tokenId: string, bestBid: number): FeedMessage => ({
  type: 'book',
  tokenId,
  bestBid,
  bestAsk: bestBid + 0.02,
  lastTrade: null,
  tickSize: '0.01',
})

test('a filter switch or a new market total re-renders only the rows whose prices changed', async () => {
  quoteStore.track(game.tokenIds)
  const { getByRole } = render(<MarketTable game={game} />)
  quoteStore.apply([
    book('ma', 0.5),
    book('mb', 0.47),
    book('o38', 0.7),
    book('u38', 0.28),
    book('o41', 0.5), // nearest to even: the market total is 41.5
    book('u41', 0.48),
    book('o44', 0.3),
    book('u44', 0.68),
  ])
  await nextFrame()
  for (const id of Object.keys(renders)) renders[id] = 0

  fireEvent.click(getByRole('button', { name: 'Totals' }))
  // 44.5 becomes the line nearest to even: the table re-renders for the new total.
  quoteStore.apply([book('o44', 0.5), book('o41', 0.6)])
  await nextFrame()

  expect(renders).toEqual({
    ma: 0,
    mb: 0,
    o38: 0,
    u38: 0,
    o41: 1,
    u41: 0,
    o44: 1,
    u44: 0,
  })
})
