import { teamsOf } from '../gamma/teams'
import { GAME_STATUS_ORDER, type Game, type GameStatus } from '../gamma/types'
import styles from './GamePicker.module.css'
import { startLabel } from './labels'

interface GamePickerProps {
  games: Game[]
  selectedId: string | null
  onSelect: (id: string) => void
}

interface GameCategory {
  title: string
  games: Game[]
}

/**
 * Upcoming games grouped by week, so week 4's games sit together and week 5's
 * after them. Games without a week go in one "Upcoming" group at the end.
 */
function splitGamesIntoWeeks(games: Game[]) {
  const byWeeks = new Map<number, Game[]>()
  const gamesWithNoWeeks: Game[] = []
  for (const game of games) {
    if (game.eventWeek === null) {
      gamesWithNoWeeks.push(game)
      continue
    }
    const weekGames = byWeeks.get(game.eventWeek)
    if (weekGames) {
      weekGames.push(game)
    } else {
      byWeeks.set(game.eventWeek, [game])
    }
  }
  const upcomingGames: GameCategory[] = []
  for (const [weekNum, games] of byWeeks.entries()) {
    upcomingGames.push({ title: `Week ${weekNum}`, games })
  }
  upcomingGames.push({ title: 'Upcoming', games: gamesWithNoWeeks })
  return upcomingGames
}

/** The list's sections: live games, then each upcoming week, then the ended ones. */
function splitGamesIntoCategories(games: Game[]): GameCategory[] {
  const byStatus: Record<GameStatus, Game[]> = {
    LIVE: [],
    PENDING: [],
    ENDED: [],
  }
  for (const game of games) byStatus[game.status].push(game)

  // The sections for each status. A Record, so a new status cannot be left out.
  const sections: Record<GameStatus, GameCategory[]> = {
    LIVE: [{ title: 'Live now', games: byStatus.LIVE }],
    PENDING: splitGamesIntoWeeks(byStatus.PENDING),
    ENDED: [{ title: 'Ended', games: byStatus.ENDED }],
  }
  return GAME_STATUS_ORDER.flatMap((status) => sections[status]).filter(
    (category) => category.games.length > 0,
  )
}

function GameButton({
  game,
  selected,
  onSelect,
}: {
  game: Game
  selected: boolean
  onSelect: (id: string) => void
}) {
  const { away, home } = teamsOf(game)
  const when = startLabel(game)
  // Screen readers hear the full matchup when the event names the teams.
  const matchup =
    game.away !== null && game.home !== null
      ? `${game.away.name} vs. ${game.home.name}`
      : game.title
  return (
    <button
      type="button"
      className={styles.game}
      aria-current={selected}
      aria-label={`${matchup}, ${when}`}
      onClick={() => onSelect(game.id)}
    >
      <span className={styles.pair}>
        <span>
          {away.code} <span className={styles.versus}>vs</span> {home.code}
        </span>
        {game.status === 'LIVE' && <span className={styles.live}>Live</span>}
      </span>
      <span className={styles.when}>{when}</span>
    </button>
  )
}

/** The games, in sections, one button each. */
export function GamePicker({ games, selectedId, onSelect }: GamePickerProps) {
  return (
    <nav className={styles.picker} aria-label="Games">
      {splitGamesIntoCategories(games).map((category) => (
        <section key={category.title}>
          <h2>{category.title}</h2>
          <ul>
            {category.games.map((game) => (
              <li key={game.id}>
                <GameButton
                  game={game}
                  selected={game.id === selectedId}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
