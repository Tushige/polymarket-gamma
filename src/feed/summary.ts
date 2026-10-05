import type { Row } from '../gamma/types'
import type { Quote } from './quote'

/*
 * The numbers the scoreboard derives from a game's quotes: each team's chance
 * to win, the market total, and where a finished game's total settled. Each
 * one comes with a picker for the tokens it depends on, so a hook can
 * subscribe to exactly those.
 */

/** Halfway between bid and ask; the one side that exists; or null. */
export function mid(quote: Pick<Quote, 'bestBid' | 'bestAsk'>): number | null {
  const { bestBid, bestAsk } = quote
  if (bestBid !== null && bestAsk !== null) return (bestBid + bestAsk) / 2
  return bestBid ?? bestAsk
}

/** The away team's chance to win (0..1), from the two moneyline mids. */
export function winChance(away: Quote, home: Quote): number | null {
  const a = mid(away)
  const h = mid(home)
  if (a !== null && h !== null) return a + h > 0 ? a / (a + h) : null
  if (a !== null) return a
  if (h !== null) return 1 - h
  return null
}

export function moneylineTokenIds(rows: readonly Row[]): string[] {
  return rows.filter((row) => row.line === null).map((row) => row.tokenId)
}

export function overTokenIds(rows: readonly Row[]): string[] {
  return rows
    .filter((row) => row.line !== null && row.outcome === 'Over')
    .map((row) => row.tokenId)
}

/** The O/U line whose Over is priced closest to even money. */
export function marketTotal(
  rows: readonly Row[],
  getQuote: (tokenId: string) => Quote,
): number | null {
  let total: number | null = null
  let bestDistance = Infinity
  for (const row of rows) {
    if (row.line === null || row.outcome !== 'Over') continue
    const price = mid(getQuote(row.tokenId))
    if (price === null) continue
    const distance = Math.abs(price - 0.5)
    if (distance < bestDistance) {
      bestDistance = distance
      total = row.line
    }
  }
  return total
}

/**
 * For a finished game: the highest line whose Over settled as a win and the
 * lowest whose Over settled as a loss. The final score lies between them.
 */
export function settledRange(
  rows: readonly Row[],
  getQuote: (tokenId: string) => Quote,
): [number | null, number | null] | null {
  let low: number | null = null
  let high: number | null = null
  for (const row of rows) {
    if (row.line === null || row.outcome !== 'Over') continue
    const price = mid(getQuote(row.tokenId))
    if (price === null) continue
    if (price > 0.5) low = low === null ? row.line : Math.max(low, row.line)
    else high = high === null ? row.line : Math.min(high, row.line)
  }
  return low === null && high === null ? null : [low, high]
}

export function settledLabel([low, high]: [
  number | null,
  number | null,
]): string {
  return `${low ?? '…'}–${high ?? '…'}`
}
