import type { Row } from '../gamma/types'

/** Every market is two rows, one per outcome (see toGame). */
export function marketCount(rows: readonly Row[]): number {
  return rows.length / 2
}

export type MarketFilter = 'all' | 'winner' | 'totals' | 'near'

/** How far from the market total a line may be and still count as "near". */
export const NEAR_POINTS = 4

export function rowsForFilter(
  rows: readonly Row[],
  filter: MarketFilter,
  total: number | null,
): readonly Row[] {
  switch (filter) {
    case 'all':
      return rows
    case 'winner':
      return rows.filter((row) => row.line === null)
    case 'totals':
      return rows.filter((row) => row.line !== null)
    case 'near':
      if (total === null) return rows
      return rows.filter(
        (row) => row.line === null || Math.abs(row.line - total) <= NEAR_POINTS,
      )
  }
}

export interface MarketGroup {
  question: string
  rows: Row[]
}

/** Consecutive rows with the same question form one market. */
export function groupByMarket(rows: readonly Row[]): MarketGroup[] {
  const groups: MarketGroup[] = []
  for (const row of rows) {
    const last = groups.at(-1)
    if (last !== undefined && last.question === row.question) {
      last.rows.push(row)
    } else {
      groups.push({ question: row.question, rows: [row] })
    }
  }
  return groups
}
