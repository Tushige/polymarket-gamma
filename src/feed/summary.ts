import type { Game, Row } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import type { SocketStatus } from './marketSocket'
import type { Quote } from './quote'

export interface Team {
  /** The short name the title and the outcomes use, e.g. "Steelers". */
  name: string
  /** Upper-case code, e.g. "PIT". */
  code: string
  /** e.g. "Pittsburgh"; empty when the event does not say. */
  city: string
}

/**
 * The event's own team details when it has them. Otherwise the title (away
 * team first, as Polymarket writes titles) and the slug ("nfl-pit-cle-…").
 */
export function teamsOf(game: Pick<Game, 'title' | 'slug' | 'away' | 'home'>): {
  away: Team
  home: Team
} {
  if (game.away !== null && game.home !== null) {
    return {
      away: {
        name: game.away.alias,
        code: game.away.code,
        city: game.away.city,
      },
      home: {
        name: game.home.alias,
        code: game.home.code,
        city: game.home.city,
      },
    }
  }
  const [awayName = game.title, homeName = ''] = game.title.split(' vs. ')
  const [, awayCode = '', homeCode = ''] = game.slug.split('-')
  return {
    away: { name: awayName, code: awayCode.toUpperCase(), city: '' },
    home: { name: homeName, code: homeCode.toUpperCase(), city: '' },
  }
}

/**
 * Whether a game belongs in the list for this search: the query appears in
 * its title, a team code, or (when the event has them) a full name or city.
 */
export function matchesTeam(
  game: Pick<Game, 'title' | 'slug' | 'away' | 'home'>,
  query: string,
): boolean {
  const wanted = query.trim().toLowerCase()
  if (wanted === '') return true
  const { away, home } = teamsOf(game)
  const haystack = [
    game.title,
    away.code,
    home.code,
    game.away?.name ?? '',
    game.home?.name ?? '',
  ]
  return haystack.some((text) => text.toLowerCase().includes(wanted))
}

/** Which team a moneyline outcome belongs to; null for totals. */
export function teamSide(
  row: Row,
  teams: { away: Team; home: Team },
): 'a' | 'b' | null {
  if (row.line !== null) return null
  if (row.outcome === teams.away.name) return 'a'
  if (row.outcome === teams.home.name) return 'b'
  return null
}

/**
 * The away and home moneyline tokens, matched by team name so the order Gamma
 * lists the outcomes in cannot swap the teams. Falls back to the listed order
 * when the names do not match the title.
 */
export function moneylineByTeam(
  game: Pick<Game, 'title' | 'slug' | 'rows' | 'away' | 'home'>,
): { away: string; home: string } | null {
  const moneyline = game.rows.filter((row) => row.line === null)
  const teams = teamsOf(game)
  const away =
    moneyline.find((row) => teamSide(row, teams) === 'a') ?? moneyline[0]
  const home =
    moneyline.find((row) => teamSide(row, teams) === 'b') ??
    moneyline.find((row) => row !== away)
  return away && home ? { away: away.tokenId, home: home.tokenId } : null
}

export function marketLabel(row: Pick<Row, 'line'>): string {
  return row.line === null ? 'Moneyline' : `O/U ${row.line}`
}

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
    if (last !== undefined && last.question === row.question)
      last.rows.push(row)
    else groups.push({ question: row.question, rows: [row] })
  }
  return groups
}

export type PillState =
  | 'loading'
  | 'error'
  | 'idle'
  | 'connecting'
  | 'live'
  | 'final'
  | 'reconnecting'

export interface StatusInput {
  games: GamesState
  socket: SocketStatus
  selected: Pick<Game, 'status' | 'rows'> | null
  /** Whether any token of the selected game has a quote yet. */
  hasBook: boolean
}

function markets(count: number): string {
  return `${count} market${count === 1 ? '' : 's'}`
}

/** The status pill's one source of truth: what the page is doing right now. */
export function statusLabel({
  games,
  socket,
  selected,
  hasBook,
}: StatusInput): { state: PillState; text: string } {
  if (games.status === 'loading') {
    return {
      state: 'loading',
      text: `Loading games · ${games.eventsCount} events scanned`,
    }
  }
  if (games.status === 'error')
    return { state: 'error', text: 'Games unavailable' }
  if (games.games.length === 0)
    return { state: 'idle', text: 'No games listed' }
  if (selected === null) return { state: 'idle', text: 'Ready · pick a game' }
  if (selected.rows.length === 0)
    return { state: 'idle', text: 'No open markets' }
  if (socket === 'reconnecting') {
    return { state: 'reconnecting', text: 'Reconnecting…' }
  }
  const count = markets(selected.rows.length / 2)
  if (selected.status === 'ENDED' && hasBook) {
    return { state: 'final', text: `Final · ${count} settled` }
  }
  if (socket === 'open' && hasBook)
    return { state: 'live', text: `Live · ${count}` }
  if (socket === 'open') return { state: 'connecting', text: 'Subscribing…' }
  return { state: 'connecting', text: 'Connecting…' }
}
