import { isRecord } from '../utils'

export type FeedMessage =
  | {
      type: 'book'
      tokenId: string
      bestBid: number | null
      bestAsk: number | null
      lastTrade: number | null
      tickSize: string | null
    }
  | {
      type: 'price_change'
      tokenId: string
      bestBid: number | null
      bestAsk: number | null
    }
  | {
      type: 'last_trade_price'
      tokenId: string
      price: number
    }
  | {
      type: 'tick_size_change'
      tokenId: string
      tickSize: string
    }

type Item = Record<string, unknown>

function bestPrice(
  items: unknown[],
  initial: number,
  comparatorFunc: (current: number, best: number) => boolean,
) {
  let bestSeen: number = initial
  for (const item of items) {
    if (!isRecord(item)) continue
    const price = toPrice(item.price)
    if (price === null) continue
    if (comparatorFunc(price, bestSeen)) {
      bestSeen = price
    }
  }
  return bestSeen !== initial ? bestSeen : null
}
function createFeedMessageFromBook(item: Item): FeedMessage[] {
  if (
    typeof item.asset_id !== 'string' ||
    !Array.isArray(item.bids) ||
    !Array.isArray(item.asks)
  ) {
    return []
  }
  return [
    {
      type: 'book',
      tokenId: item.asset_id,
      bestBid: bestPrice(
        item.bids,
        Number.MIN_SAFE_INTEGER,
        (current, best) => current > best,
      ),
      bestAsk: bestPrice(
        item.asks,
        Number.MAX_SAFE_INTEGER,
        (current, best) => current < best,
      ),
      lastTrade: toPrice(item.last_trade_price),
      tickSize:
        toPrice(item.tick_size) === null ? null : String(item.tick_size),
    },
  ]
}

function createFeedMessageFromPriceChange(item: Item): FeedMessage[] {
  if (!Array.isArray(item.price_changes)) return []
  const messages: FeedMessage[] = []
  for (const change of item.price_changes) {
    if (
      !isRecord(change) ||
      typeof change.asset_id !== 'string' ||
      typeof change.best_bid !== 'string' ||
      typeof change.best_ask !== 'string'
    ) {
      continue
    }
    messages.push({
      type: 'price_change',
      tokenId: change.asset_id,
      bestBid: toPrice(change.best_bid),
      bestAsk: toPrice(change.best_ask),
    })
  }
  return messages
}

function createFeedMessageFromLastTrade(item: Item): FeedMessage[] {
  const price = toPrice(item.price)
  if (typeof item.asset_id !== 'string' || price === null) return []
  return [
    {
      type: 'last_trade_price',
      tokenId: item.asset_id,
      price,
    },
  ]
}
function createFeedMessageFromTickSizeChange(item: Item): FeedMessage[] {
  if (typeof item.asset_id !== 'string' || !toPrice(item.new_tick_size)) {
    return []
  }
  return [
    {
      type: 'tick_size_change',
      tokenId: item.asset_id,
      tickSize: String(item.new_tick_size),
    },
  ]
}

function toFeedMessage(item: unknown): FeedMessage[] {
  if (!isRecord(item)) return []
  switch (item.event_type) {
    case 'book':
      return createFeedMessageFromBook(item)
    case 'price_change':
      return createFeedMessageFromPriceChange(item)
    case 'last_trade_price':
      return createFeedMessageFromLastTrade(item)
    case 'tick_size_change':
      return createFeedMessageFromTickSizeChange(item)
    default:
      return []
  }
}
/**
 * @param frame an Array or an Object
 * After the first subscription, the API sends an array of event_type: 'book'
 * Subsequent frames send deltas i.e. one object
 * @returns
 */
export function parseFrame(frameText: string): FeedMessage[] {
  try {
    const frame = JSON.parse(frameText)

    const frameItems: unknown[] = Array.isArray(frame) ? frame : [frame]
    /**
     * convert each item into a FeedMessage object and flatten everything into one list of FeedMessage
     */
    return frameItems.flatMap(toFeedMessage).filter((msg) => !!msg)
  } catch {
    return []
  }
}

/**
 * Takes a val and produces a price in the range of [0, 1]
 * invalid prices produce null
 * If the feed API says "no price" i.e. "", "0", or "1", then null is returned
 */
export function toPrice(val: unknown): number | null {
  if (typeof val !== 'string') return null
  const price = Number(val)
  return price > 0 && price < 1 ? price : null
}
