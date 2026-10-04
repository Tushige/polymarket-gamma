import { toGame } from './toGame'
import type { Game, GameStatus } from './types'

const MAX_PAGES = 20

export const GAME_SLUG: RegExp = /^nfl-[a-z]{2,4}-[a-z]{2,4}-\d{4}-\d{2}-\d{2}$/

const GAME_STATUS_ORDER: Record<GameStatus, number> = Object.freeze({
  LIVE: 0,
  PENDING: 1,
  ENDED: 2,
})

function getStartTimeOrInfinity(game: Game): number {
  return game.startTime === null ? Infinity : Date.parse(game.startTime)
}
function sortByStatusThenStartTime(a: Game, b: Game) {
  const diff = GAME_STATUS_ORDER[a.status] - GAME_STATUS_ORDER[b.status]
  if (diff !== 0) return diff
  // use startTime as tie breaker
  const aStartTime = getStartTimeOrInfinity(a)
  const bStartTime = getStartTimeOrInfinity(b)
  // handles the case where both times are Infinity
  if (aStartTime === bStartTime) return 0
  // return aStartTime - bStartTime
  return aStartTime < bStartTime ? -1 : 1
}

function pageUrl(offset: number) {
  return `https://gamma-api.polymarket.com/events?tag_slug=nfl&active=true&closed=false&limit=100&offset=${offset}`
}
export interface FetchGameOptions {
  fetchFn?: typeof fetch
  signal?: AbortSignal
  onProgress?: (eventsScanned: number) => void
}

/**
 * walks every page of the NFL events and returns the ones that are games
 */
export async function fetchGames(
  options: FetchGameOptions = {},
): Promise<Game[]> {
  const { fetchFn = fetch, signal, onProgress } = options

  let offset = 0

  const gamesCollection = new Map<string, Game>()
  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetchFn(pageUrl(offset), { signal })
    if (!res.ok) {
      throw new Error(`fetchGames failed. Request returned ${res.status}`)
    }
    const pageEvents = (await res.json()) as unknown
    if (!Array.isArray(pageEvents)) {
      throw new Error("gamma API didn't return a list")
    }
    if (pageEvents.length < 1) {
      return [...gamesCollection.values()].toSorted(sortByStatusThenStartTime)
    }
    const games = pageEvents
      .map((event) => toGame(event))
      .filter((event) => !!event)

    games.forEach((game) => gamesCollection.set(game.id, game))
    offset += pageEvents.length
    onProgress?.(offset)
  }
  throw new Error(
    `Gamma still returned active pages after ${MAX_PAGES} pages. Increase your page limit.`,
  )
}
