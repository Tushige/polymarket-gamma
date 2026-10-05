// @vitest-environment happy-dom
import { act, render } from '@testing-library/react'
import { Profiler } from 'react'
import { beforeAll, expect, test, vi } from 'vitest'
import { quoteStore } from '../feed/live.ts'
import type { FeedMessage } from '../feed/messages.ts'
import type { Row } from '../gamma/types.ts'
import { QuoteRow } from './MarketTable.tsx'

beforeAll(() => {
  // Test DOMs do not implement element.animate, which the flash uses.
  Element.prototype.animate = vi.fn()
})

const rows: Row[] = [
  { tokenId: 'a', question: 'Q', outcome: 'A' },
  { tokenId: 'b', question: 'Q', outcome: 'B' },
  { tokenId: 'c', question: 'Q', outcome: 'C' },
]

const book = (tokenId: string, bestBid: number): FeedMessage => ({
  type: 'book',
  tokenId,
  bestBid,
  bestAsk: bestBid + 0.01,
  lastTrade: null,
  tickSize: '0.01',
})

/** Lets the store's animation-frame flush run. */
async function nextFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

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
  const cells = getAllByRole('cell').map((cell) => cell.textContent)
  expect(cells.slice(4, 6)).toEqual(['0.61', '0.62'])
})
