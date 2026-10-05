// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import events from '../gamma/fixtures/events.sample.json'
import { toGame } from '../gamma/toGame.ts'
import type { Game } from '../gamma/types.ts'
import { Scoreboard } from './Scoreboard.tsx'

afterEach(cleanup)

function game(slug: string): Game {
  const found = toGame(events.find((event) => event.slug === slug))
  if (found === null) throw new Error(`the fixture has no game ${slug}`)
  return found
}

test('shows each team’s city above its name when the event names it', () => {
  render(<Scoreboard game={game('nfl-pit-cle-2026-10-02')} />)

  expect(screen.getByText('Pittsburgh')).toBeTruthy()
  expect(screen.getByText('Cleveland')).toBeTruthy()
  expect(screen.getByText('Steelers')).toBeTruthy()
})

test('shows no city line when the event does not name the teams', () => {
  render(<Scoreboard game={game('nfl-ne-chi-2026-10-23')} />)

  expect(screen.queryByText('New England')).toBeNull()
  expect(screen.queryByText('Chicago')).toBeNull()
  expect(screen.getByText('Patriots')).toBeTruthy()
})
