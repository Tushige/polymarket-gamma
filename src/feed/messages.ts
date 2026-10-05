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

/** One object from a frame, before its fields have been checked. */
type FrameItem = Record<string, unknown>

/**
 * The best price among a side's levels: the highest bid or the lowest ask,
 * depending on `isBetter`. Levels whose price is not a price are skipped.
 */
function bestPrice(
  levels: unknown[],
  initial: number,
  isBetter: (price: number, best: number) => boolean,
) {
  let bestSeen: number = initial
  for (const level of levels) {
    if (!isRecord(level)) continue
    const price = toPrice(level.price)
    if (price === null) continue
    if (isBetter(price, bestSeen)) {
      bestSeen = price
    }
  }
  return bestSeen !== initial ? bestSeen : null
}

/**
 * A tick size is a price step. It is kept as the string the feed sent, because
 * its number of decimals decides how prices are shown; anything else is null.
 */
function toTickSize(value: unknown): string | null {
  return typeof value === 'string' && toPrice(value) !== null ? value : null
}

function createFeedMessageFromBook(item: FrameItem): FeedMessage[] {
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
        (price, best) => price > best,
      ),
      bestAsk: bestPrice(
        item.asks,
        Number.MAX_SAFE_INTEGER,
        (price, best) => price < best,
      ),
      lastTrade: toPrice(item.last_trade_price),
      tickSize: toTickSize(item.tick_size),
    },
  ]
}

function createFeedMessageFromPriceChange(item: FrameItem): FeedMessage[] {
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

function createFeedMessageFromLastTrade(item: FrameItem): FeedMessage[] {
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

function createFeedMessageFromTickSizeChange(item: FrameItem): FeedMessage[] {
  const tickSize = toTickSize(item.new_tick_size)
  if (typeof item.asset_id !== 'string' || tickSize === null) return []
  return [
    {
      type: 'tick_size_change',
      tokenId: item.asset_id,
      tickSize,
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
 * The messages in one frame of text from the feed. After a subscription the
 * feed sends an array of `book` snapshots, one per token; after that each
 * frame is a single object. Anything unparseable or unknown gives nothing.
 */
export function parseFrame(frameText: string): FeedMessage[] {
  try {
    const frame = JSON.parse(frameText)
    const frameItems: unknown[] = Array.isArray(frame) ? frame : [frame]
    return frameItems.flatMap(toFeedMessage)
  } catch {
    return []
  }
}

/**
 * A price from the feed, which sends numbers as strings: a number strictly
 * between 0 and 1. "No price" ("", "0" or "1") and anything else give null.
 */
export function toPrice(val: unknown): number | null {
  if (typeof val !== 'string') return null
  const price = Number(val)
  return price > 0 && price < 1 ? price : null
}
