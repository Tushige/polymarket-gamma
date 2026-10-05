import type { Game, Row } from './types'

export interface Team {
  /** The short name the title and the outcomes use, e.g. "Steelers". */
  name: string
  /** Upper-case code, e.g. "PIT". */
  code: string
  /** e.g. "Pittsburgh"; empty when the event does not say. */
  city: string
}

export interface Teams {
  away: Team
  home: Team
}

export type TeamSide = keyof Teams

/**
 * The event's own team details when it has them. Otherwise the title (away
 * team first, as Polymarket writes titles) and the slug ("nfl-pit-cle-…").
 */
export function teamsOf(
  game: Pick<Game, 'title' | 'slug' | 'away' | 'home'>,
): Teams {
  if (game.away !== null && game.home !== null) {
    return {
      away: {
        name: game.away.alias,
        code: game.away.code,
        city: game.away.city,
      },
      home: {
        name: game.home.alias,
        code: game.home.code,
        city: game.home.city,
      },
    }
  }
  const [awayName = game.title, homeName = ''] = game.title.split(' vs. ')
  const [, awayCode = '', homeCode = ''] = game.slug.split('-')
  return {
    away: { name: awayName, code: awayCode.toUpperCase(), city: '' },
    home: { name: homeName, code: homeCode.toUpperCase(), city: '' },
  }
}

/**
 * Whether a game belongs in the list for this search: the query appears in
 * its title, a team code, or (when the event has them) a full name or city.
 */
export function matchesTeam(
  game: Pick<Game, 'title' | 'slug' | 'away' | 'home'>,
  query: string,
): boolean {
  const wanted = query.trim().toLowerCase()
  if (wanted === '') return true
  const { away, home } = teamsOf(game)
  const haystack = [
    game.title,
    away.code,
    home.code,
    game.away?.name ?? '',
    game.home?.name ?? '',
  ]
  return haystack.some((text) => text.toLowerCase().includes(wanted))
}

/** Which team a moneyline outcome belongs to; null for totals. */
export function teamSide(row: Row, teams: Teams): TeamSide | null {
  if (row.line !== null) return null
  if (row.outcome === teams.away.name) return 'away'
  if (row.outcome === teams.home.name) return 'home'
  return null
}

/**
 * The away and home moneyline tokens, matched by team name so the order Gamma
 * lists the outcomes in cannot swap the teams. Falls back to the listed order
 * when the names do not match the title.
 */
export function moneylineByTeam(
  game: Pick<Game, 'title' | 'slug' | 'rows' | 'away' | 'home'>,
): { away: string; home: string } | null {
  const moneyline = game.rows.filter((row) => row.line === null)
  const teams = teamsOf(game)
  const away =
    moneyline.find((row) => teamSide(row, teams) === 'away') ?? moneyline[0]
  const home =
    moneyline.find((row) => teamSide(row, teams) === 'home') ??
    moneyline.find((row) => row !== away)
  return away && home ? { away: away.tokenId, home: home.tokenId } : null
}
