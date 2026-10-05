import type { ReactNode } from 'react'
import { useSocketStatus } from '../feed/live'

/**
 * Wraps the table and marks it stale while the connection is being restored.
 * The table is passed in as children, so this re-rendering does not re-render it.
 */
export function LiveArea({ children }: { children: ReactNode }) {
  const status = useSocketStatus()
  return (
    <div
      className="live-area"
      data-stale={status === 'reconnecting' || undefined}
    >
      {children}
    </div>
  )
}
