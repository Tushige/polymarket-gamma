import type { Game } from '../gamma/types'

/** In the viewer's own locale and time zone. */
const dateTime = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})
const clock = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})
const day = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})

/** When a game starts, worded for its status. */
export function startLabel(game: Pick<Game, 'status' | 'startTime'>): string {
  if (game.startTime === null) {
    return game.status === 'ENDED' ? 'Final' : 'Time to be announced'
  }
  const start = new Date(game.startTime)
  if (game.status === 'LIVE') return `Kicked off ${clock.format(start)}`
  if (game.status === 'ENDED') return `Final · ${day.format(start)}`
  return dateTime.format(start)
}

export function kickerLabel(
  game: Pick<Game, 'status' | 'startTime' | 'eventWeek'>,
): string {
  const when = startLabel(game)
  return game.eventWeek === null ? when : `Week ${game.eventWeek} · ${when}`
}

/** After this long with no book, the scoreboard says it is still waiting. */
export const STILL_WAITING_MS = 2500

export function updatedText(input: {
  now: number
  shownAt: number
  lastChange: number | null
  hasBook: boolean
  ended: boolean
}): string {
  const { now, shownAt, lastChange, hasBook, ended } = input
  if (ended) return 'Settled · nothing trades'
  if (!hasBook) {
    return now - shownAt >= STILL_WAITING_MS
      ? 'Still waiting for the first prices…'
      : 'Waiting for the book…'
  }
  if (lastChange === null) return 'Waiting for the first move…'
  const seconds = Math.round((now - lastChange) / 1000)
  if (seconds < 3) return 'Updated just now'
  if (seconds < 60) return `Updated ${seconds} s ago`
  return `Updated ${Math.round(seconds / 60)} min ago`
}

export function unopenedNote(count: number): string {
  const lines = count === 1 ? 'line is' : 'lines are'
  return `${count} O/U ${lines} listed but not open yet.`
}

export function weeksLabel(weeks: number[]): string {
  if (weeks.length === 0) return ''
  const first = Math.min(...weeks)
  const last = Math.max(...weeks)
  return first === last ? `Week ${first}` : `Weeks ${first}–${last}`
}
