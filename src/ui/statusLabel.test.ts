import { describe, expect, test } from 'vitest'
import type { GamesState } from '../gamma/useGames'
import { makeGame, ROWS } from '../test/fixtures'
import { statusLabel, type StatusInput } from './statusLabel'

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
