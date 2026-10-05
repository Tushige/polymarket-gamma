import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createMarketSocket } from './marketSocket.ts'

class FakeWebSocket {
  static created: FakeWebSocket[] = []

  url: string
  sent: string[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeWebSocket.created.push(this)
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.onclose?.()
  }

  serverAccepts() {
    this.onopen?.()
  }

  serverSends(data: unknown) {
    this.onmessage?.({ data })
  }
}

function setup() {
  const frames: string[] = []
  const client = createMarketSocket({
    url: 'wss://example.test/ws/market',
    onFrame: (text) => frames.push(text),
    WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
  })
  const connection = () => {
    const ws = FakeWebSocket.created.at(-1)
    if (!ws) throw new Error('the client has not connected')
    return ws
  }
  const sentJson = () =>
    connection()
      .sent.filter((frame) => frame !== 'PING')
      .map((frame) => JSON.parse(frame) as unknown)
  return { client, frames, connection, sentJson }
}

beforeEach(() => {
  FakeWebSocket.created = []
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

test('does not connect until something is subscribed', () => {
  const { client } = setup()
  expect(FakeWebSocket.created).toHaveLength(0)

  client.subscribe(['a', 'b'])

  expect(FakeWebSocket.created).toHaveLength(1)
  expect(FakeWebSocket.created[0]?.url).toBe('wss://example.test/ws/market')
})

test('sends nothing until the connection is open', () => {
  const { client, connection } = setup()

  client.subscribe(['a', 'b'])
  vi.advanceTimersByTime(30_000)

  expect(connection().sent).toEqual([])
})

test('the first frame is the subscribe message', () => {
  const { client, connection, sentJson } = setup()

  client.subscribe(['a', 'b'])
  connection().serverAccepts()

  expect(sentJson()).toEqual([
    { assets_ids: ['a', 'b'], type: 'market', initial_dump: true },
  ])
})
test('a subscribe made while waiting to reconnect travels in the next first frame', () => {
  const { client, connection, sentJson } = setup()
  client.subscribe(['a'])
  connection().serverAccepts()
  connection().close()

  client.subscribe(['b'])
  vi.advanceTimersByTime(1000)
  connection().serverAccepts()

  expect(FakeWebSocket.created).toHaveLength(2)
  expect(sentJson()).toEqual([
    { assets_ids: ['a', 'b'], type: 'market', initial_dump: true },
  ])
})

test('reports its status, and tells listeners when it changes', () => {
  const { client, connection } = setup()
  const seen: string[] = []
  client.onStatusChange(() => seen.push(client.getStatus()))
  expect(client.getStatus()).toBe('idle')

  client.subscribe(['a'])
  connection().serverAccepts()
  connection().close()
  client.close()

  expect(seen).toEqual(['connecting', 'open', 'reconnecting', 'idle'])
})

test('subscribe, unsubscribe, subscribe before opening leaves one subscription', () => {
  const { client, connection, sentJson } = setup()

  client.subscribe(['a'])
  client.unsubscribe(['a'])
  client.subscribe(['a'])
  connection().serverAccepts()

  expect(FakeWebSocket.created).toHaveLength(1)
  expect(sentJson()).toEqual([
    { assets_ids: ['a'], type: 'market', initial_dump: true },
  ])
})

test('switching games sends operation frames on the same connection', () => {
  const { client, connection, sentJson } = setup()
  client.subscribe(['a', 'b'])
  connection().serverAccepts()

  client.unsubscribe(['a', 'b'])
  client.subscribe(['c', 'd'])

  expect(FakeWebSocket.created).toHaveLength(1)
  expect(sentJson().slice(1)).toEqual([
    { operation: 'unsubscribe', assets_ids: ['a', 'b'] },
    { operation: 'subscribe', assets_ids: ['c', 'd'] },
  ])
})

test('hands every text frame to onFrame exactly as it arrived', () => {
  const { client, connection, frames } = setup()
  client.subscribe(['a'])
  connection().serverAccepts()

  connection().serverSends('PONG')
  connection().serverSends('[{"event_type":"book"}]')
  connection().serverSends(new ArrayBuffer(8))

  expect(frames).toEqual(['PONG', '[{"event_type":"book"}]'])
})

describe('Testing PING', () => {
  test('pings every ten seconds, starting after the first frame', () => {
    const { client, connection } = setup()

    client.subscribe(['a'])
    connection().serverAccepts()
    expect(connection().sent).toHaveLength(1)

    vi.advanceTimersByTime(10_000)
    expect(connection().sent.at(-1)).toBe('PING')

    connection().serverSends('PONG')
    vi.advanceTimersByTime(10_000)
    connection().serverSends('PONG')
    vi.advanceTimersByTime(10_000)
    expect(connection().sent.filter((frame) => frame === 'PING')).toHaveLength(
      3,
    )
  })

  test('stops pinging once the connection has closed', () => {
    const { client, connection } = setup()
    client.subscribe(['a'])
    const ws = connection()
    ws.serverAccepts()

    ws.close()
    vi.advanceTimersByTime(60_000)

    expect(ws.sent.filter((frame) => frame === 'PING')).toHaveLength(0)
  })
})

describe('reconnecting', () => {
  beforeEach(() => {
    // Jitter would make the delays unpredictable. Pin it to "the full delay".
    vi.spyOn(Math, 'random').mockReturnValue(1)
  })

  afterEach(() => {
    // Give the real Math.random back, so the pin cannot leak into other tests.
    vi.restoreAllMocks()
  })

  test('connects again after a drop, with delays that double', () => {
    const { client, connection } = setup()
    client.subscribe(['a'])
    connection().serverAccepts()

    connection().close()
    expect(client.getStatus()).toBe('reconnecting')
    vi.advanceTimersByTime(999)
    expect(FakeWebSocket.created).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.created).toHaveLength(2)

    connection().close() // the attempt failed
    vi.advanceTimersByTime(1999)
    expect(FakeWebSocket.created).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeWebSocket.created).toHaveLength(3)
  })

  test('never waits longer than the cap', () => {
    const { client, connection } = setup()
    client.subscribe(['a'])
    connection().serverAccepts()

    for (let i = 0; i < 10; i++) {
      connection().close()
      vi.advanceTimersByTime(30_000)
    }

    expect(FakeWebSocket.created).toHaveLength(11)
  })

  test('the delay starts small again once a connection has delivered a frame', () => {
    const { client, connection } = setup()
    client.subscribe(['a'])
    connection().serverAccepts()
    connection().close()
    vi.advanceTimersByTime(1000)
    connection().serverAccepts()
    connection().serverSends('PONG')

    connection().close()
    vi.advanceTimersByTime(1000)

    expect(FakeWebSocket.created).toHaveLength(3)
  })

  test('the new connection subscribes to what is wanted now, not then', () => {
    const { client, connection, sentJson } = setup()
    client.subscribe(['a'])
    connection().serverAccepts()
    connection().close()

    client.unsubscribe(['a'])
    client.subscribe(['b'])
    vi.advanceTimersByTime(1000)
    connection().serverAccepts()

    expect(sentJson()).toEqual([
      { assets_ids: ['b'], type: 'market', initial_dump: true },
    ])
  })

  test('reports a reconnect, but not the first connection', () => {
    const onReconnect = vi.fn()
    const client = createMarketSocket({
      url: 'wss://example.test/ws/market',
      onFrame: () => {},
      onReconnect,
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    })
    client.subscribe(['a'])
    FakeWebSocket.created[0]?.serverAccepts()
    expect(onReconnect).not.toHaveBeenCalled()

    FakeWebSocket.created[0]?.close()
    vi.advanceTimersByTime(1000)
    FakeWebSocket.created[1]?.serverAccepts()

    expect(onReconnect).toHaveBeenCalledTimes(1)
  })

  test('close() means closed: no reconnect follows', () => {
    const { client, connection } = setup()
    client.subscribe(['a'])
    connection().serverAccepts()

    client.close()
    vi.advanceTimersByTime(60_000)

    expect(client.getStatus()).toBe('idle')
    expect(FakeWebSocket.created).toHaveLength(1)
  })
})

test('retry() connects now instead of waiting out the delay', () => {
  const { client, connection } = setup()
  client.subscribe(['a'])
  connection().serverAccepts()
  connection().close()
  vi.advanceTimersByTime(100)

  client.retry()

  expect(FakeWebSocket.created).toHaveLength(2)
  vi.advanceTimersByTime(60_000)
  expect(FakeWebSocket.created).toHaveLength(2)
})

test('retry() does nothing while a connection is open', () => {
  const { client, connection } = setup()
  client.subscribe(['a'])
  connection().serverAccepts()

  client.retry()

  expect(FakeWebSocket.created).toHaveLength(1)
})
