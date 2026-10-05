import { useState } from 'react'
import { matchesTeam } from '../gamma/teams'
import type { Game } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import { GamePicker } from './GamePicker'
import { weeksLabel } from './labels'
import { marketCount } from './marketRows'
import styles from './Rail.module.css'
import tool from './shared/tool.module.css'
import { PickerSkeleton } from './Skeleton'

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

function SlateFooter({ games }: { games: Game[] }) {
  const markets = games.reduce((sum, game) => sum + marketCount(game.rows), 0)
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
