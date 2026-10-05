import { useSocketStatus, retryConnection } from '../feed/live.ts'
import type { SocketStatus } from '../feed/marketSocket.ts'

const LABEL: Record<SocketStatus, string> = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
}
export function ConnectionStatus() {
  const status = useSocketStatus()
  if (status === 'idle') return null

  return (
    <p className="connection" data-status={status} role="status">
      <span className="connection-dot" aria-hidden="true" />
      {LABEL[status]}
      {status === 'reconnecting' && (
        <button
          type="button"
          className="connection-retry"
          onClick={retryConnection}
        >
          Retry now
        </button>
      )}
    </p>
  )
}
