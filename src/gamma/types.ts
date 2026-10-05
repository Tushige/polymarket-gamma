export interface Row {
  tokenId: string
  outcome: string
  question: string
}
/**
 * Every status a game can have, in the order games are listed: being played,
 * then upcoming, then finished. The type is derived from this list, so adding a
 * status means adding it here, in its place.
 */
export const GAME_STATUS_ORDER = ['LIVE', 'PENDING', 'ENDED'] as const
export type GameStatus = (typeof GAME_STATUS_ORDER)[number]
export interface Game {
  id: string
  slug: string
  title: string
  tokenIds: string[]
  rows: Row[]
  inactiveMarketCount: number
  startTime: string | null
  status: GameStatus
  eventWeek: number | null
}
