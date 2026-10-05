import { isRecord } from '../utils'
import type { Game, GameStatus, Row, TeamInfo } from './types'

const NUMBER = /^\d+(\.\d+)?$/
export const GAME_SLUG: RegExp = /^nfl-[a-z]{2,4}-[a-z]{2,4}-\d{4}-\d{2}-\d{2}$/

type LineGroup = {
  line: number
  rows: Row[]
}

function getStatus(event: Record<string, unknown>): GameStatus {
  if (event.ended === true) return 'ENDED'
  if (event.live === true) return 'LIVE'
  return 'PENDING'
}

function getStartTime(event: Record<string, unknown>): string | null {
  for (const value of [event.startTime, event.endDate]) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) continue
    return value
  }
  return null
}

/** "Houston Texans" with alias "Texans" → "Houston". Empty when the alias is not the name's ending. */
export function cityOf(name: string, alias: string): string {
  const suffix = ` ${alias}`
  return name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : ''
}

function toTeam(value: unknown): (TeamInfo & { ordering: unknown }) | null {
  if (!isRecord(value)) return null
  const { name, alias, abbreviation, ordering } = value
  if (
    typeof name !== 'string' ||
    typeof alias !== 'string' ||
    typeof abbreviation !== 'string'
  ) {
    return null
  }
  return {
    name,
    alias,
    code: abbreviation.toUpperCase(),
    city: cityOf(name, alias),
    ordering,
  }
}

/**
 * The event's `teams` field, placed by its own `ordering`. Both teams or
 * neither: a half-described matchup falls back to the title and slug.
 */
function getTeams(event: Record<string, unknown>): {
  away: TeamInfo | null
  home: TeamInfo | null
} {
  const none = { away: null, home: null }
  if (!Array.isArray(event.teams)) return none
  const teams = event.teams.map(toTeam)
  const find = (ordering: string): TeamInfo | null => {
    const team = teams.find((candidate) => candidate?.ordering === ordering)
    if (!team) return null
    const { name, alias, code, city } = team
    return { name, alias, code, city }
  }
  const away = find('away')
  const home = find('home')
  return away && home ? { away, home } : none
}

/**
 * Gamma sends `outcomes` and `clobTokenIds` as JSON text holding two strings.
 * Returns null for anything else, including a missing field.
 */
export function parsePair(value: unknown): [string, string] | null {
  if (typeof value !== 'string') return null
  try {
    const arr = JSON.parse(value)
    if (!Array.isArray(arr) || arr.length !== 2) return null
    if (arr.some((el) => typeof el !== 'string')) return null
    return arr as [string, string]
  } catch {
    return null
  }
}

/** "Chiefs vs. Dolphins: O/U 41.5" with title "Chiefs vs. Dolphins" → 41.5. Otherwise null. */
export function totalLine(title: string, question: string): number | null {
  const prefix = `${title}: O/U `
  if (!question.startsWith(prefix)) return null
  const numbersPart = question.slice(prefix.length)

  return NUMBER.test(numbersPart) ? Number(numbersPart) : null
}

function collectRows(
  market: Record<string, unknown>,
  question: string,
  line: number | null,
): Row[] | null {
  const outcomes = parsePair(market.outcomes)
  const tokenIds = parsePair(market.clobTokenIds)
  if (!tokenIds || !outcomes) return null
  return [
    { tokenId: tokenIds[0], question, outcome: outcomes[0], line },
    { tokenId: tokenIds[1], question, outcome: outcomes[1], line },
  ]
}

/**
 * A Game from one Gamma event, or null when the event is not a game: not an
 * object, missing a string id, title or slug, or a slug that is not of the
 * GAME_SLUG form (team codes and a kickoff date, nothing after).
 */
export function toGame(event: unknown): Game | null {
  if (!isRecord(event)) return null
  const { id, title, slug, markets } = event
  if (
    typeof id !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string'
  ) {
    return null
  }
  if (!GAME_SLUG.test(slug)) return null
  const game: Game = {
    id,
    slug,
    title,
    rows: [],
    tokenIds: [],
    inactiveMarketCount: 0,
    startTime: getStartTime(event),
    status: getStatus(event),
    eventWeek: typeof event.eventWeek === 'number' ? event.eventWeek : null,
    ...getTeams(event),
  }
  // walk the markets
  if (Array.isArray(markets)) {
    const moneylineRows: Row[] = []
    const totalLineRows: Array<LineGroup> = []
    for (const market of markets) {
      if (!isRecord(market) || typeof market.question !== 'string') continue

      const isMoneyLine = market.question === title
      const line = totalLine(title, market.question)

      // any market that is not a moneyline or totalline is ignored
      if (!isMoneyLine && line === null) continue

      const marketRows = collectRows(market, market.question, line)
      if (marketRows === null) {
        game.inactiveMarketCount++
        continue
      }

      if (isMoneyLine) {
        moneylineRows.push(...marketRows)
      } else if (line !== null) {
        totalLineRows.push({ line, rows: marketRows })
      }
    }
    // In the game's rows, moneyline goes first, then totalLine is sorted in ASC
    game.rows.push(...moneylineRows)
    totalLineRows.sort((a, b) => a.line - b.line)
    game.rows.push(...totalLineRows.map((lineRow) => lineRow.rows).flat())
  }
  game.tokenIds = game.rows.map((row) => row.tokenId)
  return game
}
