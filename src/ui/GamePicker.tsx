import { useState } from 'react'
import { matchesTeam, teamsOf } from '../feed/summary'
import { GAME_STATUS_ORDER, type Game, type GameStatus } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import { startLabel, weeksLabel } from './labels'
import styles from './GamePicker.module.css'
import tool from './shared/tool.module.css'
import { PickerSkeleton } from './Skeleton'

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
 * Given games in the future, we split them by weeks so we can display week 4
 * games together and week 5 games together
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

function SlateFooter({ games }: { games: Game[] }) {
  const markets = games.reduce((sum, game) => sum + game.rows.length / 2, 0)
  const weeks = weeksLabel(
    games
      .map((game) => game.eventWeek)
      .filter((week): week is number => week !== null),
  )
  return (
    <div className={styles.footer}>
      <b>The slate</b>
      {games.length} games · {markets} markets
      <br />
      NFL{weeks === '' ? '' : ` · ${weeks}`}
    </div>
  )
}

interface RailProps {
  state: GamesState
  retry: () => void
  selectedId: string | null
  onSelect: (id: string) => void
}

function TeamSearch({
  query,
  onChange,
}: {
  query: string
  onChange: (query: string) => void
}) {
  return (
    <div className={styles.search}>
      <input
        id="team-search"
        type="search"
        aria-label="Find a team"
        placeholder="Team or city"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('')
        }}
      />
    </div>
  )
}

/**
 * The left column in every state of the games request. The search only
 * narrows the list: the game being watched stays on the board.
 */
export function Rail({ state, retry, selectedId, onSelect }: RailProps) {
  const [query, setQuery] = useState('')

  if (state.status === 'loading') {
    return <PickerSkeleton eventsCount={state.eventsCount} />
  }
  if (state.status === 'error') {
    return (
      <div className={styles.notice} role="alert">
        <b>Couldn’t load the games.</b>
        <span className={styles.reason}>{state.message}</span>
        <button type="button" className={styles.noticeButton} onClick={retry}>
          Try again
        </button>
      </div>
    )
  }
  if (state.games.length === 0) {
    return (
      <div className={styles.notice}>
        <b>No NFL games are listed right now.</b>
        <p>Games appear here as soon as Polymarket lists them.</p>
        <button type="button" className={styles.noticeButton} onClick={retry}>
          Check again
        </button>
      </div>
    )
  }
  const matching = state.games.filter((game) => matchesTeam(game, query))
  return (
    <>
      <TeamSearch query={query} onChange={setQuery} />
      {matching.length === 0 ? (
        <div className={styles.empty} role="status">
          <p>No games match “{query.trim()}”.</p>
          <button
            type="button"
            className={tool.button}
            onClick={() => setQuery('')}
          >
            Clear
          </button>
        </div>
      ) : (
        <GamePicker
          games={matching}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
      <SlateFooter games={state.games} />
    </>
  )
}
