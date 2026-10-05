import type { Game, Row } from '../gamma/types'

/** One game, hand-built: a moneyline and three total lines. */
export const TITLE = 'Steelers vs. Browns'

export const row = (
  tokenId: string,
  outcome: string,
  line: number | null,
): Row => ({
  tokenId,
  outcome,
  line,
  question: line === null ? TITLE : `${TITLE}: O/U ${line}`,
})

export const ROWS: Row[] = [
  row('pit', 'Steelers', null),
  row('cle', 'Browns', null),
  row('o38', 'Over', 38.5),
  row('u38', 'Under', 38.5),
  row('o41', 'Over', 41.5),
  row('u41', 'Under', 41.5),
  row('o44', 'Over', 44.5),
  row('u44', 'Under', 44.5),
]

export function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: '885112',
    slug: 'nfl-pit-cle-2026-10-02',
    title: TITLE,
    rows: ROWS,
    tokenIds: ROWS.map((r) => r.tokenId),
    inactiveMarketCount: 0,
    startTime: '2026-10-02T00:15:00Z',
    status: 'PENDING',
    eventWeek: 4,
    away: null,
    home: null,
    ...overrides,
  }
}

/** The same game, with the teams the event itself would describe. */
export const WITH_TEAMS: Partial<Game> = {
  away: {
    name: 'Pittsburgh Steelers',
    alias: 'Steelers',
    code: 'PIT',
    city: 'Pittsburgh',
  },
  home: {
    name: 'Cleveland Browns',
    alias: 'Browns',
    code: 'CLE',
    city: 'Cleveland',
  },
}
