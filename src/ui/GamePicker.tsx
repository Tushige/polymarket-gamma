import type { Game } from '../gamma/types'

/**
 * use the user's local time
 */
const DateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface GamepickerProps {
  games: Game[]
  selectedId: string | null
  onSelect: (id: string) => void
}

interface GameCategory {
  title: string
  games: Game[]
}

function startTimeLabel(game: Game) {
  if (game.startTime === null) return 'TBD'
  return DateFormatter.format(new Date(game.startTime))
}

/**
 * Given games in the future, we split them by weeks so we can display week 4 games together and week 5 games together
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
/**
 * Takes a list of games and splits into sections
 */
function splitGamesIntoCategories(games: Game[]): GameCategory[] {
  const liveGames: GameCategory = { title: 'Live now', games: [] }
  const finishedGames: GameCategory = { title: 'Ended', games: [] }
  const pendingGames: Game[] = []

  for (const game of games) {
    if (game.status === 'LIVE') {
      liveGames.games.push(game)
    } else if (game.status === 'ENDED') {
      finishedGames.games.push(game)
    } else {
      pendingGames.push(game)
    }
  }
  return [
    liveGames,
    ...splitGamesIntoWeeks(pendingGames),
    finishedGames,
  ].filter((category) => category.games.length > 0)
}

export function GamePicker({ games, selectedId, onSelect }: GamepickerProps) {
  return (
    <nav className="picker" aria-label="Games">
      {splitGamesIntoCategories(games).map((category) => (
        <section key={category.title}>
          <h2>{category.title}</h2>
          <ul>
            {category.games.map((game) => (
              <li key={game.id}>
                <button
                  type="button"
                  aria-current={game.id === selectedId}
                  onClick={() => onSelect(game.id)}
                >
                  <span className="picker-title">{game.title}</span>
                  <span className="picker-time">{startTimeLabel(game)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  )
}
