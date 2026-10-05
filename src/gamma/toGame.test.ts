import { describe, expect, test } from 'vitest'
import events from './fixtures/events.sample.json'
import { cityOf, toGame } from './toGame'

function event(slug: string) {
  const found = events.find((candidate) => candidate.slug === slug)
  if (!found) throw new Error(`the fixture has no event ${slug}`)
  return found
}

describe('cityOf', () => {
  test('is the full name without the short name', () => {
    expect(cityOf('Houston Texans', 'Texans')).toBe('Houston')
    expect(cityOf('Los Angeles Rams', 'Rams')).toBe('Los Angeles')
    expect(cityOf('San Francisco 49ers', '49ers')).toBe('San Francisco')
    expect(cityOf('New York Giants', 'Giants')).toBe('New York')
  })

  test('is empty when the short name is not the end of the full name', () => {
    expect(cityOf('Washington Commanders', 'Commies')).toBe('')
    expect(cityOf('Texans', 'Texans')).toBe('')
  })
})

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
      status: 'PENDING',
      startTime: '2026-10-02T00:15:00Z',
      eventWeek: 4,
    })
  })

  test('the moneyline gives two rows, one per outcome, each with its own token', () => {
    const game = toGame(event('nfl-pit-cle-2026-10-02'))
    expect(game).not.toBeNull()
    expect(game?.rows![0]).toMatchObject({
      tokenId:
        '114452029473938322994940072047457517711080146350796218905893406566691475251935',
      question: 'Steelers vs. Browns',
      outcome: 'Steelers',
    })
    expect(game?.rows![1]).toMatchObject({
      tokenId:
        '98756637703320879198441871470345384821367334051929992047845197222571333888980',
      question: 'Steelers vs. Browns',
      outcome: 'Browns',
    })
  })

  test('lists the moneyline first, then every total line in ascending order', () => {
    const game = toGame(event('nfl-pit-cle-2026-10-02'))
    const labels = game?.rows.map((row) => `${row.question} | ${row.outcome}`)
    expect(labels).toEqual([
      'Steelers vs. Browns | Steelers',
      'Steelers vs. Browns | Browns',
      'Steelers vs. Browns: O/U 35.5 | Over',
      'Steelers vs. Browns: O/U 35.5 | Under',
      'Steelers vs. Browns: O/U 38.5 | Over',
      'Steelers vs. Browns: O/U 38.5 | Under',
      'Steelers vs. Browns: O/U 41.5 | Over',
      'Steelers vs. Browns: O/U 41.5 | Under',
      'Steelers vs. Browns: O/U 44.5 | Over',
      'Steelers vs. Browns: O/U 44.5 | Under',
      'Steelers vs. Browns: O/U 64.5 | Over',
      'Steelers vs. Browns: O/U 64.5 | Under',
    ])
  })

  test('a game with only a moneyline has just those two rows', () => {
    expect(toGame(event('nfl-ne-chi-2026-10-23'))?.rows).toHaveLength(2)
  })

  test('has no rows when the markets field is missing or malformed', () => {
    const raw = { ...event('nfl-ne-chi-2026-10-23'), markets: 'none' }
    expect(toGame(raw)?.rows).toEqual([])
  })

  test('skips and counts markets that have no clobTokenIds', () => {
    const game = toGame(event('nfl-nyg-hou-2026-10-25'))
    expect(game?.rows.map((row) => row.outcome)).toEqual(['Giants', 'Texans'])
    expect(game?.inactiveMarketCount).toBe(2)
  })

  test('marks a finished game as ended', () => {
    expect(toGame(event('nfl-sea-was-2026-09-27'))?.status).toBe('ENDED')
  })

  test('takes startTime from startTime when endDate disagrees', () => {
    const raw = event('nfl-chi-gb-2026-10-11')
    expect(raw.endDate).not.toBe(raw.startTime)
    expect(toGame(raw)?.startTime).toBe('2026-10-11T17:00:00Z')
  })

  test('keeps each team’s full name, city and code, placed by home and away', () => {
    const game = toGame(event('nfl-pit-cle-2026-10-02'))
    expect(game?.away).toEqual({
      name: 'Pittsburgh Steelers',
      alias: 'Steelers',
      code: 'PIT',
      city: 'Pittsburgh',
    })
    expect(game?.home).toEqual({
      name: 'Cleveland Browns',
      alias: 'Browns',
      code: 'CLE',
      city: 'Cleveland',
    })
  })

  test('has no team details when the event carries none, or carries them malformed', () => {
    expect(toGame(event('nfl-ne-chi-2026-10-23'))).toMatchObject({
      away: null,
      home: null,
    })
    const broken = { ...event('nfl-pit-cle-2026-10-02'), teams: 'none' }
    expect(toGame(broken)).toMatchObject({ away: null, home: null })
    const oneSided = {
      ...event('nfl-pit-cle-2026-10-02'),
      teams: [
        {
          name: 'Pittsburgh Steelers',
          alias: 'Steelers',
          abbreviation: 'pit',
          ordering: 'away',
        },
      ],
    }
    expect(toGame(oneSided)).toMatchObject({ away: null, home: null })
  })

  test('a moneyline row has no line; a total row carries its line', () => {
    const game = toGame(event('nfl-pit-cle-2026-10-02'))
    expect(game?.rows[0]?.line).toBeNull()
    expect(game?.rows[2]).toMatchObject({ outcome: 'Over', line: 35.5 })
    expect(game?.rows[3]).toMatchObject({ outcome: 'Under', line: 35.5 })
  })
})
