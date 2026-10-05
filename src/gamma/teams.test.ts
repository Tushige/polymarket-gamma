import { describe, expect, test } from 'vitest'
import { makeGame, row, WITH_TEAMS } from '../test/fixtures'
import { matchesTeam, moneylineByTeam, teamSide, teamsOf } from './teams'

describe('teamsOf', () => {
  test('prefers the event’s own team details, with cities', () => {
    expect(teamsOf(makeGame(WITH_TEAMS))).toEqual({
      away: { name: 'Steelers', code: 'PIT', city: 'Pittsburgh' },
      home: { name: 'Browns', code: 'CLE', city: 'Cleveland' },
    })
  })

  test('without them, takes names from the title, away first, and codes from the slug', () => {
    expect(teamsOf(makeGame())).toEqual({
      away: { name: 'Steelers', code: 'PIT', city: '' },
      home: { name: 'Browns', code: 'CLE', city: '' },
    })
  })

  test('does not throw on a title without "vs."', () => {
    expect(
      teamsOf({ title: 'Super Bowl', slug: 'nfl-x', away: null, home: null }),
    ).toEqual({
      away: { name: 'Super Bowl', code: 'X', city: '' },
      home: { name: '', code: '', city: '' },
    })
  })
})

describe('matchesTeam', () => {
  const withTeams = makeGame(WITH_TEAMS)

  test('matches a team name or code, in any case', () => {
    expect(matchesTeam(makeGame(), 'browns')).toBe(true)
    expect(matchesTeam(makeGame(), 'STE')).toBe(true)
    expect(matchesTeam(makeGame(), 'pit')).toBe(true)
  })

  test('matches a city or a full name when the event has them', () => {
    expect(matchesTeam(withTeams, 'cleveland')).toBe(true)
    expect(matchesTeam(withTeams, 'Pittsburgh Steelers')).toBe(true)
    expect(matchesTeam(makeGame(), 'cleveland')).toBe(false)
  })

  test('an empty or blank query matches every game; spaces around it are ignored', () => {
    expect(matchesTeam(makeGame(), '')).toBe(true)
    expect(matchesTeam(makeGame(), '   ')).toBe(true)
    expect(matchesTeam(makeGame(), '  browns ')).toBe(true)
  })

  test('does not match another team', () => {
    expect(matchesTeam(withTeams, 'texans')).toBe(false)
  })
})

describe('teamSide', () => {
  test('marks the moneyline outcomes by team, and nothing else', () => {
    const teams = teamsOf(makeGame())
    expect(teamSide(row('pit', 'Steelers', null), teams)).toBe('away')
    expect(teamSide(row('cle', 'Browns', null), teams)).toBe('home')
    expect(teamSide(row('o38', 'Over', 38.5), teams)).toBeNull()
  })
})

describe('moneylineByTeam', () => {
  test('finds each team’s token by name, whichever order Gamma lists them in', () => {
    const reversed = [row('cle', 'Browns', null), row('pit', 'Steelers', null)]
    expect(moneylineByTeam(makeGame({ rows: reversed }))).toEqual({
      away: 'pit',
      home: 'cle',
    })
  })

  test('falls back to the listed order when the names do not match the title', () => {
    const unnamed = [row('x', 'Yes', null), row('y', 'No', null)]
    expect(moneylineByTeam(makeGame({ rows: unnamed }))).toEqual({
      away: 'x',
      home: 'y',
    })
  })

  test('is null without a moneyline', () => {
    expect(moneylineByTeam(makeGame({ rows: [] }))).toBeNull()
  })
})
