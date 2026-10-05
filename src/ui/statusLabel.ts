import type { SocketStatus } from '../feed/marketSocket'
import type { Game } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import { marketCount } from './marketRows'

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
  if (games.status === 'error') {
    return { state: 'error', text: 'Games unavailable' }
  }
  if (games.games.length === 0) {
    return { state: 'idle', text: 'No games listed' }
  }
  if (selected === null) {
    return { state: 'idle', text: 'Ready · pick a game' }
  }
  if (selected.rows.length === 0) {
    return { state: 'idle', text: 'No open markets' }
  }
  if (socket === 'reconnecting') {
    return { state: 'reconnecting', text: 'Reconnecting…' }
  }
  const count = markets(marketCount(selected.rows))
  if (selected.status === 'ENDED' && hasBook) {
    return { state: 'final', text: `Final · ${count} settled` }
  }
  if (socket === 'open' && hasBook) {
    return { state: 'live', text: `Live · ${count}` }
  }
  if (socket === 'open') {
    return { state: 'connecting', text: 'Subscribing…' }
  }
  return { state: 'connecting', text: 'Connecting…' }
}
