// @vitest-environment happy-dom
import { cleanup, render, within } from '@testing-library/react'
import { Profiler } from 'react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import { quoteStore } from '../feed/live'
import type { FeedMessage } from '../feed/messages'
import type { Row } from '../gamma/types'
import { nextFrame, stubElementAnimate } from '../test/dom'
import { QuoteRow } from './MarketTable'

beforeAll(stubElementAnimate)

afterEach(() => {
  cleanup()
  quoteStore.clear()
})

const rows: Row[] = [
  { tokenId: 'a', question: 'Q', outcome: 'A', line: null },
  { tokenId: 'b', question: 'Q', outcome: 'B', line: null },
  { tokenId: 'c', question: 'Q', outcome: 'C', line: null },
]

const book = (tokenId: string, bestBid: number): FeedMessage => ({
  type: 'book',
  tokenId,
  bestBid,
  bestAsk: bestBid + 0.01,
  lastTrade: null,
  tickSize: '0.01',
})

test('a message for one token re-renders that row and no other', async () => {
  const renders: Record<string, number> = {}
  const count = (id: string) => {
    renders[id] = (renders[id] ?? 0) + 1
  }
  quoteStore.track(['a', 'b', 'c'])

  const { getAllByRole } = render(
    <table>
      <tbody>
        {rows.map((row) => (
          <Profiler key={row.tokenId} id={row.tokenId} onRender={count}>
            <QuoteRow row={row} />
          </Profiler>
        ))}
      </tbody>
    </table>,
  )
  quoteStore.apply([book('a', 0.5), book('b', 0.6), book('c', 0.7)])
  await nextFrame()
  for (const id of Object.keys(renders)) renders[id] = 0

  quoteStore.apply([
    { type: 'price_change', tokenId: 'b', bestBid: 0.61, bestAsk: 0.62 },
  ])
  await nextFrame()

  expect(renders).toEqual({ a: 0, b: 1, c: 0 })
  const values = getAllByRole('cell').map(
    (cell) => within(cell).getByTestId('price').textContent,
  )
  expect(values.slice(4, 6)).toEqual(['61¢', '62¢'])
})
