// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import events from '../gamma/fixtures/events.sample.json'
import { toGame } from '../gamma/toGame'
import type { Game } from '../gamma/types'
import { GamePicker } from './GamePicker'

// In kickoff order, as fetchGames hands them over; the picker keeps that order.
const games = events
  .map((event) => toGame(event))
  .filter((game): game is Game => game !== null)
  .toSorted((a, b) => Date.parse(a.startTime!) - Date.parse(b.startTime!))

function game(slug: string): Game {
  const found = games.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`the fixture has no game ${slug}`)
  return found
}

afterEach(cleanup)

/** The section headings, in the order they appear. */
const headings = () =>
  screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)

test('groups the games by status, upcoming ones by week, finished ones last', () => {
  const live: Game = {
    ...game('nfl-den-sf-2026-10-04'),
    id: 'live',
    status: 'LIVE',
  }
  render(
    <GamePicker
      games={[live, ...games]}
      selectedId={null}
      onSelect={() => {}}
    />,
  )

  expect(headings()).toEqual([
    'Live now',
    'Week 4',
    'Week 5',
    'Week 7',
    'Ended',
  ])
  expect(screen.getByText('Live')).toBeTruthy()
})

test('names each game by its team codes and marks the selected one', () => {
  const picked: string[] = []
  render(
    <GamePicker
      games={games}
      selectedId={game('nfl-pit-cle-2026-10-02').id}
      onSelect={(id) => picked.push(id)}
    />,
  )

  const steelers = screen.getByRole('button', {
    name: /Pittsburgh Steelers vs\. Cleveland Browns/,
  })
  expect(steelers.textContent).toContain('PIT')
  expect(steelers.textContent).toContain('CLE')
  expect(steelers.getAttribute('aria-current')).toBe('true')

  fireEvent.click(screen.getByRole('button', { name: /Bears vs\. Packers/ }))
  expect(picked).toEqual([game('nfl-chi-gb-2026-10-11').id])
})
