import { retryConnection, useHasBook, useSocketStatus } from '../feed/live'
import type { Game } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import { statusLabel } from './statusLabel'
import styles from './StatusPill.module.css'

const NO_TOKENS: readonly string[] = []

/** The one place that says what the page is doing. */
export function StatusPill({
  games,
  selected,
}: {
  games: GamesState
  selected: Game | null
}) {
  const socket = useSocketStatus()
  const hasBook = useHasBook(selected?.tokenIds ?? NO_TOKENS)
  const { state, text } = statusLabel({ games, socket, selected, hasBook })

  return (
    <div className={styles.status} data-state={state} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <span>{text}</span>
      {state === 'reconnecting' && (
        <button
          type="button"
          className={styles.retry}
          onClick={retryConnection}
        >
          Retry now
        </button>
      )}
    </div>
  )
}
