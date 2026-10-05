import { useEffect, useState } from 'react'
import {
  quoteStore,
  useHasBook,
  useMarketTotal,
  useSettledLabel,
  useWinChancePct,
} from '../feed/live'
import { teamsOf, type Team, type TeamSide } from '../gamma/teams'
import type { Game } from '../gamma/types'
import { kickerLabel, updatedText } from './labels'
import styles from './Scoreboard.module.css'

function StatusTag({ status }: { status: Game['status'] }) {
  if (status === 'LIVE') return <span className={styles.pill}>Live</span>
  const quiet = `${styles.pill} ${styles.quiet}`
  if (status === 'ENDED') return <span className={quiet}>Final</span>
  return <span className={quiet}>Pre-game</span>
}

function TeamBlock({
  side,
  team,
  pct,
}: {
  side: TeamSide
  team: Team
  pct: number | null
}) {
  return (
    <div className={`${styles.team} ${styles[side]}`}>
      <div className={styles.emblem} aria-hidden="true">
        {team.code}
      </div>
      <div>
        {team.city !== '' && <div className={styles.city}>{team.city}</div>}
        <div className={styles.name}>{team.name}</div>
        <div className={styles.winValue}>
          <span>{pct ?? '–'}</span>
          <small>%</small>
        </div>
        <div className={styles.winLabel}>chance to win</div>
      </div>
    </div>
  )
}

/** Ticks once a second; the only part of the board that does. */
function UpdatedAgo({ game, hasBook }: { game: Game; hasBook: boolean }) {
  const [shownAt] = useState(() => Date.now())
  const [now, setNow] = useState(shownAt)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <span className={styles.mono}>
      {updatedText({
        now,
        shownAt,
        lastChange: quoteStore.lastChange(game.tokenIds),
        hasBook,
        ended: game.status === 'ENDED',
      })}
    </span>
  )
}

/** The game header: teams, chances, the market total, and how fresh it all is. */
export function Scoreboard({ game }: { game: Game }) {
  const { away, home } = teamsOf(game)
  const awayPct = useWinChancePct(game)
  const total = useMarketTotal(game)
  const settled = useSettledLabel(game)
  const hasBook = useHasBook(game.tokenIds)
  const hasTotals = game.rows.some((row) => row.line !== null)
  const homePct = awayPct === null ? null : 100 - awayPct

  let centre: string
  let centreLabel: string
  if (!hasTotals) {
    centre = '—'
    centreLabel = 'no totals listed'
  } else if (game.status === 'ENDED') {
    centre = settled === null ? '–' : `O/U ${settled}`
    centreLabel = 'total settled between'
  } else {
    centre = total === null ? '–' : `O/U ${total}`
    centreLabel = 'market total'
  }

  return (
    <section className={styles.card} aria-label={game.title}>
      <div className={styles.top}>
        <span className={styles.kicker}>{kickerLabel(game)}</span>
        <StatusTag status={game.status} />
      </div>
      <div className={styles.match}>
        <TeamBlock side="away" team={away} pct={awayPct} />
        <div className={styles.centre}>
          <div className={styles.centreNumber}>{centre}</div>
          <div className={styles.centreLabel}>{centreLabel}</div>
        </div>
        <TeamBlock side="home" team={home} pct={homePct} />
      </div>
      <div className={styles.probability} aria-hidden="true">
        <i style={{ flexGrow: awayPct ?? 50 }} />
        <i style={{ flexGrow: homePct ?? 50 }} />
      </div>
      <div className={styles.bottom}>
        <UpdatedAgo game={game} hasBook={hasBook} />
      </div>
    </section>
  )
}
