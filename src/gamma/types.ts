export interface Row {
  tokenId: string
  outcome: string
  question: string
}
export type GameStatus = 'PENDING' | 'LIVE' | 'ENDED'
export interface Game {
  id: string
  slug: string
  title: string
  rows: Row[]
  inactiveMarketCount: number
  startTime: string | null
  status: GameStatus
}
