import { describe, expect, test } from 'vitest'
import type { Row } from '../gamma/types'
import { ROWS, TITLE } from '../test/fixtures'
import { groupByMarket, marketCount, rowsForFilter } from './marketRows'

const tokens = (rows: readonly Row[]) => rows.map((r) => r.tokenId)

test('marketCount is half the rows: every market is one row per outcome', () => {
  expect(marketCount(ROWS)).toBe(4)
  expect(marketCount([])).toBe(0)
})

describe('rowsForFilter', () => {
  test('all shows every row; winner the moneyline; totals the O/U lines', () => {
    expect(rowsForFilter(ROWS, 'all', null)).toBe(ROWS)
    expect(tokens(rowsForFilter(ROWS, 'winner', null))).toEqual(['pit', 'cle'])
    expect(rowsForFilter(ROWS, 'totals', null)).toHaveLength(6)
  })

  test('near keeps the moneyline and lines within four points of the total', () => {
    expect(tokens(rowsForFilter(ROWS, 'near', 44.5))).toEqual([
      'pit',
      'cle',
      'o41',
      'u41',
      'o44',
      'u44',
    ])
  })

  test('near shows everything until there is a total', () => {
    expect(rowsForFilter(ROWS, 'near', null)).toBe(ROWS)
  })
})

test('groupByMarket gathers consecutive rows of one question', () => {
  const groups = groupByMarket(ROWS)
  expect(groups).toHaveLength(4)
  expect(groups[0]).toEqual({ question: TITLE, rows: ROWS.slice(0, 2) })
  expect(groups[3]?.question).toBe(`${TITLE}: O/U 44.5`)
})
