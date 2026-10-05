export type SocketStatus = 'idle' | 'connecting' | 'open' | 'reconnecting'
export interface MarketSocketOptions {
  url: string
  onFrame: (text: string) => void
  pingIntervalMs?: number
  /** The first reconnect delay. Each failure doubles it, up to `reconnectMaxMs`. */
  reconnectBaseMs?: number
  reconnectMaxMs?: number
  onReconnect?: () => void
  WebSocketCtor?: typeof WebSocket
}

export interface MarketSocket {
  subscribe(tokenIds: readonly string[]): void
  unsubscribe(tokenIds: readonly string[]): void
  /**
   * closes the socket for good
   */
  close(): void
  getStatus(): SocketStatus
  onStatusChange(listener: () => void): () => void
  /** Connect now instead of waiting out the reconnect delay. */
  retry(): void
}
/**
 * The first frame sent must be a subscription. Anything else gets back a 1008
 *
 */
export function createMarketSocket(options: MarketSocketOptions): MarketSocket {
  const {
    url,
    onFrame,
    pingIntervalMs = 10_000,
    reconnectBaseMs = 1_000,
    reconnectMaxMs = 30_000,
    onReconnect,
    WebSocketCtor = WebSocket,
  } = options
  const assetIds = new Set<string>()
  let socket: WebSocket | null = null
  let status: SocketStatus = 'idle'
  const statusListeners = new Set<() => void>()
  let hadConnection = false
  let closedForGood = false
  let failures = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined

  function send(message: object) {
    socket?.send(JSON.stringify(message))
  }

  /** Somewhere between half and all of the capped, doubling delay. */
  function reconnectDelay(): number {
    const capped = Math.min(reconnectMaxMs, reconnectBaseMs * 2 ** failures)
    return capped * (0.5 + Math.random() / 2)
  }

  function handleClose(ws: WebSocket) {
    if (socket !== ws) return // an older connection we had already abandoned
    socket = null
    if (closedForGood) {
      setStatus('idle')
      return
    }
    setStatus('reconnecting')
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined
      connect()
    }, reconnectDelay())
    failures += 1
  }

  function connect() {
    const ws = new WebSocketCtor(url)
    let pingTimer: ReturnType<typeof setInterval> | undefined
    socket = ws
    closedForGood = false
    setStatus('connecting')

    ws.onopen = () => {
      send({
        assets_ids: [...assetIds],
        type: 'market',
        initial_dump: true,
      })
      if (hadConnection) onReconnect?.()
      hadConnection = true
      pingTimer = setInterval(() => ws.send('PING'), pingIntervalMs)
      setStatus('open')
    }
    ws.onmessage = (event) => {
      failures = 0
      if (typeof event.data === 'string') {
        onFrame(event.data)
      }
    }
    ws.onclose = () => {
      clearInterval(pingTimer)
      handleClose(ws)
    }
  }

  function setStatus(next: SocketStatus) {
    if (status === next) return
    status = next
    for (const listener of statusListeners) listener()
  }

  return {
    /**
     *
     * @param tokenIds a list of new tokenIds to subscribe to. if we're already subscribed to [a, b], then tokenIds=[c] will net [a, b, c] subscriptions.
     * @returns void
     */
    subscribe(tokenIds) {
      if (tokenIds.length === 0) return
      for (const id of tokenIds) assetIds.add(id)

      if (socket === null && reconnectTimer === undefined) {
        connect()
      } else if (status === 'open') {
        send({ operation: 'subscribe', assets_ids: tokenIds })
      }
    },
    unsubscribe(tokenIds) {
      if (tokenIds.length === 0) return
      for (const id of tokenIds) {
        assetIds.delete(id)
      }
      if (status === 'open') {
        send({ operation: 'unsubscribe', assets_ids: tokenIds })
      }
    },
    /**
     * can only be called when the page is torn down, not between component remounts.
     */

    close() {
      closedForGood = true
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
      assetIds.clear()
      if (socket === null) {
        setStatus('idle')
      } else {
        socket.close()
      }
    },
    getStatus() {
      return status
    },

    onStatusChange(listener) {
      statusListeners.add(listener)
      return () => {
        statusListeners.delete(listener)
      }
    },
    retry() {
      if (reconnectTimer === undefined) return
      clearTimeout(reconnectTimer)
      reconnectTimer = undefined
      connect()
    },
  }
}
