import type { ReactNode } from 'react'
import table from './MarketTable.module.css'
import board from './Scoreboard.module.css'
import styles from './Skeleton.module.css'

/** A placeholder block, plus the classes that give it its shape. */
function block(...shape: (string | undefined)[]): string {
  return [styles.block, ...shape].join(' ')
}

/** The rail while the games load: the count of events scanned, then row shapes. */
export function PickerSkeleton({ eventsCount }: { eventsCount: number }) {
  return (
    <div>
      <p className={styles.progress}>
        <span className={styles.progressDot} aria-hidden="true" />
        Finding games · <span className={styles.count}>{eventsCount}</span>{' '}
        events scanned
      </p>
      {[3, 4].map((rows, group) => (
        <div className={styles.group} key={group} aria-hidden="true">
          <span className={block(styles.heading)} />
          {Array.from({ length: rows }, (_, row) => (
            <span className={styles.row} key={row}>
              <span className={block(styles.line1)} />
              <span className={block(styles.line2)} />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

/** The same layout as a real team block (Scoreboard), filled with shapes. */
function SkeletonTeam({ home = false }: { home?: boolean }) {
  const end = home ? styles.alignEnd : undefined
  return (
    <div className={`${board.team} ${home ? board.home : board.away}`}>
      <span className={block(styles.emblem)} />
      <div>
        <span className={block(styles.name, end)} />
        <span className={block(styles.number, end)} />
      </div>
    </div>
  )
}

/** The scoreboard's shape, with one line of text underneath. */
export function ScoreboardSkeleton({ note }: { note: string }) {
  return (
    <div className={board.card} aria-hidden="true">
      <div className={board.top}>
        <span className={block(styles.kicker)} />
        <span className={block(styles.pill)} />
      </div>
      <div className={board.match}>
        <SkeletonTeam />
        <div className={board.centre}>
          <span className={block(styles.centre)} />
          <span className={block(styles.centre2)} />
        </div>
        <SkeletonTeam home />
      </div>
      <span className={block(styles.bar)} />
      <div className={board.bottom}>
        <span>{note}</span>
      </div>
    </div>
  )
}

/** Six table rows' worth of shapes, in the table's own layout. */
export function TableSkeleton() {
  return (
    <div className={table.panel} aria-hidden="true">
      <div className={table.head}>
        <span className={block(styles.title)} />
      </div>
      <table className={table.table}>
        <tbody className={styles.rows}>
          {Array.from({ length: 6 }, (_, row) => (
            <tr key={row}>
              <td>
                <span className={block(styles.cell, styles.cellLabel)} />
              </td>
              <td>
                <span className={block(styles.cell, styles.cellShort)} />
              </td>
              <td>
                <span className={block(styles.cell)} />
              </td>
              <td>
                <span className={block(styles.cell)} />
              </td>
              <td>
                <span className={block(styles.cell)} />
              </td>
              <td>
                <span className={block(styles.cell, styles.cellNarrow)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** One calm card in place of the scoreboard, when there is nothing to show. */
export function BoardNotice({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className={board.card}>
      <div className={styles.notice}>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </section>
  )
}
