import { isRecord } from '../utils'
import { GAME_SLUG } from './fetchGames'
import type { Game, GameStatus, Row } from './types'

const NUMBER = /^\d+(\.\d+)?$/

type LineGroup = {
  line: number
  rows: Row[]
}
function getStatus(event: Record<string, unknown>): GameStatus {
  if (event.ended) return 'ENDED'
  if (event.live) return 'LIVE'
  return 'PENDING'
}

function getStartTime(event: Record<string, unknown>): string | null {
  for (const value of [event.startTime, event.endDate]) {
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) continue
    return value
  }
  return null
}

/**
 * Gamma sends `outcomes` and `clobTokenIds` as JSON text holding two strings.
 * Returns null for anything else, including a missing field.
 */
export function parsePair(value: unknown): [string, string] | null {
  if (!value || typeof value !== 'string') return null
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
): Row[] | null {
  const outcomes = parsePair(market.outcomes)
  const tokenIds = parsePair(market.clobTokenIds)
  if (!tokenIds || !outcomes) return null
  return [
    { tokenId: tokenIds[0], question, outcome: outcomes[0] },
    { tokenId: tokenIds[1], question, outcome: outcomes[1] },
  ]
}

/**
 *
 * @param event
 * @returns a Game object if the event is a game, null otherwise
 * An event is a game if
 * 1. event is an object
 * 2. id, title, slug fields are strings
 * 3. the title is of the GAME_SLUG form
 */
export function toGame(event: unknown): Game | null {
  if (!isRecord(event)) return null
  const { id, title, slug, markets } = event
  if (
    typeof id !== 'string' ||
    typeof slug !== 'string' ||
    typeof title !== 'string'
  )
    return null
  if (!GAME_SLUG.test(slug)) return null
  const game: Game = {
    id,
    slug,
    title,
    rows: [],
    inactiveMarketCount: 0,
    startTime: getStartTime(event),
    status: getStatus(event),
    eventWeek: typeof event.eventWeek === 'number' ? event.eventWeek : null,
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

      const marketRows = collectRows(market, market.question)
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
  return game
}
