import { describe, expect, test } from 'vitest'
import { cityOf } from '../gamma/toGame.ts'
import type { Game, Row } from '../gamma/types.ts'
import type { GamesState } from '../gamma/useGames.ts'
import { EMPTY_QUOTE, type Quote } from './quote.ts'
import {
  type StatusInput,
  groupByMarket,
  matchesTeam,
  marketLabel,
  marketTotal,
  mid,
  moneylineTokenIds,
  overTokenIds,
  rowsForFilter,
  settledLabel,
  settledRange,
  statusLabel,
  teamSide,
  teamsOf,
  winChance,
} from './summary.ts'

const TITLE = 'Steelers vs. Browns'
const row = (tokenId: string, outcome: string, line: number | null): Row => ({
  tokenId,
  outcome,
  line,
  question: line === null ? TITLE : `${TITLE}: O/U ${line}`,
})
const ROWS: Row[] = [
  row('pit', 'Steelers', null),
  row('cle', 'Browns', null),
  row('o38', 'Over', 38.5),
  row('u38', 'Under', 38.5),
  row('o41', 'Over', 41.5),
  row('u41', 'Under', 41.5),
  row('o44', 'Over', 44.5),
  row('u44', 'Under', 44.5),
]
function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: '885112',
    slug: 'nfl-pit-cle-2026-10-02',
    title: TITLE,
    rows: ROWS,
    tokenIds: ROWS.map((r) => r.tokenId),
    inactiveMarketCount: 0,
    startTime: '2026-10-02T00:15:00Z',
    status: 'PENDING',
    eventWeek: 4,
    away: null,
    home: null,
    ...overrides,
  }
}
const quote = (bestBid: number | null, bestAsk: number | null): Quote => ({
  bestBid,
  bestAsk,
  lastTrade: null,
  tickSize: '0.01',
})
const quotes = (map: Record<string, Quote>) => (tokenId: string) =>
  map[tokenId] ?? EMPTY_QUOTE
const tokens = (rows: readonly Row[]) => rows.map((r) => r.tokenId)

describe('cityOf', () => {
  test('is the full name without the short name', () => {
    expect(cityOf('Houston Texans', 'Texans')).toBe('Houston')
    expect(cityOf('Los Angeles Rams', 'Rams')).toBe('Los Angeles')
    expect(cityOf('San Francisco 49ers', '49ers')).toBe('San Francisco')
    expect(cityOf('New York Giants', 'Giants')).toBe('New York')
  })

  test('is empty when the short name is not the end of the full name', () => {
    expect(cityOf('Washington Commanders', 'Commies')).toBe('')
    expect(cityOf('Texans', 'Texans')).toBe('')
  })
})

describe('teamsOf', () => {
  test('prefers the event’s own team details, with cities', () => {
    const game = makeGame({
      away: {
        name: 'Pittsburgh Steelers',
        alias: 'Steelers',
        code: 'PIT',
        city: 'Pittsburgh',
      },
      home: {
        name: 'Cleveland Browns',
        alias: 'Browns',
        code: 'CLE',
        city: 'Cleveland',
      },
    })
    expect(teamsOf(game)).toEqual({
      away: { name: 'Steelers', code: 'PIT', city: 'Pittsburgh' },
      home: { name: 'Browns', code: 'CLE', city: 'Cleveland' },
    })
  })

  test('without them, takes names from the title, away first, and codes from the slug', () => {
    expect(teamsOf(makeGame())).toEqual({
      away: { name: 'Steelers', code: 'PIT', city: '' },
      home: { name: 'Browns', code: 'CLE', city: '' },
    })
  })

  test('does not throw on a title without "vs."', () => {
    expect(
      teamsOf({ title: 'Super Bowl', slug: 'nfl-x', away: null, home: null }),
    ).toEqual({
      away: { name: 'Super Bowl', code: 'X', city: '' },
      home: { name: '', code: '', city: '' },
    })
  })
})

describe('matchesTeam', () => {
  const withTeams = makeGame({
    away: {
      name: 'Pittsburgh Steelers',
      alias: 'Steelers',
      code: 'PIT',
      city: 'Pittsburgh',
    },
    home: {
      name: 'Cleveland Browns',
      alias: 'Browns',
      code: 'CLE',
      city: 'Cleveland',
    },
  })

  test('matches a team name or code, in any case', () => {
    expect(matchesTeam(makeGame(), 'browns')).toBe(true)
    expect(matchesTeam(makeGame(), 'STE')).toBe(true)
    expect(matchesTeam(makeGame(), 'pit')).toBe(true)
  })

  test('matches a city or a full name when the event has them', () => {
    expect(matchesTeam(withTeams, 'cleveland')).toBe(true)
    expect(matchesTeam(withTeams, 'Pittsburgh Steelers')).toBe(true)
    expect(matchesTeam(makeGame(), 'cleveland')).toBe(false)
  })

  test('an empty or blank query matches every game; spaces around it are ignored', () => {
    expect(matchesTeam(makeGame(), '')).toBe(true)
    expect(matchesTeam(makeGame(), '   ')).toBe(true)
    expect(matchesTeam(makeGame(), '  browns ')).toBe(true)
  })

  test('does not match another team', () => {
    expect(matchesTeam(withTeams, 'texans')).toBe(false)
  })
})

describe('teamSide', () => {
  test('marks the moneyline outcomes by team, and nothing else', () => {
    const teams = teamsOf(makeGame())
    expect(teamSide(row('pit', 'Steelers', null), teams)).toBe('a')
    expect(teamSide(row('cle', 'Browns', null), teams)).toBe('b')
    expect(teamSide(row('o38', 'Over', 38.5), teams)).toBeNull()
  })
})

test('marketLabel names the market briefly', () => {
  expect(marketLabel({ line: null })).toBe('Moneyline')
  expect(marketLabel({ line: 41.5 })).toBe('O/U 41.5')
})

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

describe('statusLabel', () => {
  const ready: GamesState = { status: 'ready', games: [makeGame()] }
  const base: StatusInput = {
    games: ready,
    socket: 'open',
    selected: makeGame(),
    hasBook: true,
  }

  test('while the games load, it counts the events scanned', () => {
    expect(
      statusLabel({ ...base, games: { status: 'loading', eventsCount: 300 } }),
    ).toEqual({ state: 'loading', text: 'Loading games · 300 events scanned' })
  })

  test('says when the games are unavailable or there are none', () => {
    expect(
      statusLabel({ ...base, games: { status: 'error', message: 'boom' } }),
    ).toEqual({ state: 'error', text: 'Games unavailable' })
    expect(
      statusLabel({ ...base, games: { status: 'ready', games: [] } }),
    ).toEqual({ state: 'idle', text: 'No games listed' })
  })

  test('asks for a pick when nothing is selected', () => {
    expect(statusLabel({ ...base, selected: null })).toEqual({
      state: 'idle',
      text: 'Ready · pick a game',
    })
  })

  test('says so when the selected game has no markets', () => {
    expect(
      statusLabel({ ...base, selected: makeGame({ rows: [], tokenIds: [] }) }),
    ).toEqual({ state: 'idle', text: 'No open markets' })
  })

  test('connecting, then subscribing, then live with the market count', () => {
    expect(
      statusLabel({ ...base, socket: 'connecting', hasBook: false }),
    ).toEqual({ state: 'connecting', text: 'Connecting…' })
    expect(statusLabel({ ...base, hasBook: false })).toEqual({
      state: 'connecting',
      text: 'Subscribing…',
    })
    expect(statusLabel(base)).toEqual({
      state: 'live',
      text: 'Live · 4 markets',
    })
  })

  test('a finished game reads as final, singular when it must', () => {
    const ended = makeGame({ status: 'ENDED', rows: ROWS.slice(0, 2) })
    expect(statusLabel({ ...base, selected: ended })).toEqual({
      state: 'final',
      text: 'Final · 1 market settled',
    })
  })

  test('reconnecting wins over everything about the game', () => {
    expect(statusLabel({ ...base, socket: 'reconnecting' })).toEqual({
      state: 'reconnecting',
      text: 'Reconnecting…',
    })
  })
})
