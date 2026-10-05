import { Fragment } from 'react'
import type { Game } from '../gamma/types'
import type { GamesState } from '../gamma/useGames'
import styles from './Board.module.css'
import { LiveArea } from './LiveArea'
import { MarketTable } from './MarketTable'
import { Scoreboard } from './Scoreboard'
import { BoardNotice, ScoreboardSkeleton, TableSkeleton } from './Skeleton'

/** The right-hand side in every state: loading, failed, empty, unpicked, live. */
export function Board({
  state,
  selected,
}: {
  state: GamesState
  selected: Game | null
}) {
  if (state.status === 'loading') {
    return (
      <>
        <ScoreboardSkeleton note="Finding this week’s games…" />
        <TableSkeleton />
      </>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.dim}>
        <ScoreboardSkeleton note="" />
        <TableSkeleton />
      </div>
    )
  }
  if (state.games.length === 0) {
    return (
      <BoardNotice title="Nothing to watch yet">
        Pick a game once the list fills in; prices start streaming the moment
        you do.
      </BoardNotice>
    )
  }
  if (selected === null) {
    return (
      <BoardNotice title="Pick a game">
        Prices start streaming the moment you do.
      </BoardNotice>
    )
  }
  return (
    <LiveArea>
      {/* One key for both: a different game is a different scoreboard and table. */}
      <Fragment key={selected.id}>
        <Scoreboard game={selected} />
        <MarketTable game={selected} />
      </Fragment>
    </LiveArea>
  )
}
