import { describe, expect, test } from 'vitest'
import events from './fixtures/events.sample.json'
import { toGame } from './toGame'

function event(slug: string) {
  const found = events.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`the fixture has no event ${slug}`)
  return found
}

describe('toGame', () => {
  test('is null for events that are not games', () => {
    expect(toGame(event('pro-football-afc-east-champion'))).toBeNull()
    expect(toGame(event('nfl-pit-cle-2026-10-02-player-props'))).toBeNull()
    expect(
      toGame(event('nfl-pit-cle-2026-10-02-highest-scoring-quarter')),
    ).toBeNull()
  })

  test('is null for anything that is not an event', () => {
    expect(toGame(null)).toBeNull()
    expect(toGame('nfl-kc-mia-2026-09-27')).toBeNull()
    expect(toGame({})).toBeNull()
  })

  test('keeps the identifying fields', () => {
    const game = toGame(event('nfl-pit-cle-2026-10-02'))
    expect(game).toMatchObject({
      id: '885112',
      slug: 'nfl-pit-cle-2026-10-02',
      title: 'Steelers vs. Browns',
    })
  })
})
