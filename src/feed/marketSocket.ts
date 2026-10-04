export interface MarketSocketOptions {
  url: string
  onFrame: (text: string) => void
  pingIntervalMs?: number
  WebSocketCtor?: typeof WebSocket
}

export interface MarketSocket {
  subscribe(tokenIds: readonly string[]): void
  unsubscribe(tokenIds: readonly string[]): void
  close(): void
}
/**
 * The first frame sent must be a subscription. Anything else gets back a 1008
 */
export function createMarketSocket(options: MarketSocketOptions): MarketSocket {
  const {
    url,
    onFrame,
    pingIntervalMs = 10_000,
    WebSocketCtor = WebSocket,
  } = options
  const assetIds = new Set<string>()
  let socket: WebSocket | null = null
  let isOpen = false
  let pingIntervalId: ReturnType<typeof setInterval> | undefined

  function send(message: object) {
    socket?.send(JSON.stringify(message))
  }

  function connect() {
    const ws = new WebSocketCtor(url)
    socket = ws

    ws.onopen = () => {
      isOpen = true
      send({
        assets_ids: [...assetIds],
        type: 'market',
        initial_dump: true,
      })

      pingIntervalId = setInterval(() => {
        ws.send('PING')
      }, pingIntervalMs)
    }
    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        onFrame(event.data)
      }
    }
    ws.onclose = () => {
      socket = null
      isOpen = false
      clearInterval(pingIntervalId)
    }
  }

  return {
    /**
     *
     * @param tokenIds a list of new tokenIds to subscribe to. if we're already subscribed to [a, b], then tokenIds=[c] will net [a, b, c] subscriptions.
     * @returns void
     */
    subscribe(tokenIds) {
      if (tokenIds.length < 1) return
      for (const id of tokenIds) {
        assetIds.add(id)
      }

      if (socket === null) {
        connect()
      } else if (isOpen) {
        send({ operation: 'subscribe', assets_ids: tokenIds })
      }
    },
    unsubscribe(tokenIds) {
      if (tokenIds.length === 0) return
      for (const id of tokenIds) {
        assetIds.delete(id)
      }
      if (isOpen) {
        send({ operation: 'unsubscribe', assets_ids: tokenIds })
      }
    },
    close() {
      assetIds.clear()
      socket?.close()
    },
  }
}
