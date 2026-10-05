/** One outcome of one market: a row of the table and a token on the feed. */
export interface Row {
  tokenId: string
  outcome: string
  question: string
  /** null for the moneyline; the O/U number for a full-game total. */
  line: number | null
}

/**
 * Every status a game can have, in the order games are listed: being played,
 * then upcoming, then finished. The type is derived from this list, so adding a
 * status means adding it here, in its place.
 */
export const GAME_STATUS_ORDER = ['LIVE', 'PENDING', 'ENDED'] as const
export type GameStatus = (typeof GAME_STATUS_ORDER)[number]

/** One team, as the event's own `teams` field describes it. */
export interface TeamInfo {
  /** "Houston Texans" */
  name: string
  /** "Texans": the name the title and the moneyline outcomes use. */
  alias: string
  /** "HOU" */
  code: string
  /** "Houston"; empty when it cannot be worked out from the name. */
  city: string
}

export interface Game {
  id: string
  slug: string
  title: string
  /** Every row's token, in row order: what the feed is asked for. */
  tokenIds: string[]
  /** The moneyline's two rows first, then each total line's, lowest line first. */
  rows: Row[]
  /** In-scope markets Gamma lists without tokens: not open for trading yet. */
  inactiveMarketCount: number
  startTime: string | null
  status: GameStatus
  eventWeek: number | null
  /** From the event's `teams` field; null when it is missing or malformed. */
  away: TeamInfo | null
  home: TeamInfo | null
}
