// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import events from '../gamma/fixtures/events.sample.json'
import { toGame } from '../gamma/toGame.ts'
import type { Game } from '../gamma/types.ts'
import { Rail } from './GamePicker.tsx'

const games = events
  .map((event) => toGame(event))
  .filter((game): game is Game => game !== null)

// Without Vitest globals, Testing Library cannot unmount between tests by itself.
afterEach(cleanup)

function renderRail() {
  render(
    <Rail
      state={{ status: 'ready', games }}
      retry={() => {}}
      selectedId={null}
      onSelect={() => {}}
    />,
  )
  return screen.getByRole('searchbox', { name: 'Find a team' })
}

/** The matchups the list offers, as a screen reader names them (without the time). */
const shown = () => {
  const list = screen.queryByRole('navigation', { name: 'Games' })
  if (list === null) return []
  return within(list)
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label')?.split(', ')[0])
}

test('typing a team name narrows the list to its games', () => {
  const search = renderRail()
  expect(shown()).toHaveLength(games.length)

  fireEvent.change(search, { target: { value: 'browns' } })

  expect(shown()).toEqual(['Pittsburgh Steelers vs. Cleveland Browns'])
})

test('a city from the event’s own team details finds the game', () => {
  const search = renderRail()

  fireEvent.change(search, { target: { value: 'Cleveland' } })

  expect(shown()).toEqual(['Pittsburgh Steelers vs. Cleveland Browns'])
})

test('no match says so, and Clear brings every game back', () => {
  const search = renderRail()

  fireEvent.change(search, { target: { value: 'zzz' } })
  expect(shown()).toEqual([])
  expect(screen.getByText(/No games match/).textContent).toContain('zzz')

  fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
  expect(shown()).toHaveLength(games.length)
})

test('Escape clears the search', () => {
  const search = renderRail()
  fireEvent.change(search, { target: { value: 'browns' } })

  fireEvent.keyDown(search, { key: 'Escape' })

  expect(shown()).toHaveLength(games.length)
})
