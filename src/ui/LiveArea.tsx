import type { ReactNode } from 'react'
import { useSocketStatus } from '../feed/live'
import styles from './LiveArea.module.css'

/**
 * Wraps the scoreboard and the table. While the connection is being restored
 * it dims the numbers (stale is still information) and says why. The children
 * are created by the parent, so this re-rendering does not re-render them.
 */
export function LiveArea({ children }: { children: ReactNode }) {
  const stale = useSocketStatus() === 'reconnecting'
  return (
    <div className={styles.area} data-stale={stale || undefined}>
      {stale && (
        <div className={styles.banner}>
          <span className={styles.bannerDot} aria-hidden="true" />
          <span>Prices paused — reconnecting to the feed…</span>
        </div>
      )}
      {children}
    </div>
  )
}
