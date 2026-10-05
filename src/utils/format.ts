export function decimalsForTick(tickSize: string | null): number {
  if (tickSize === null) return 2
  const point = tickSize.indexOf('.')
  return point === -1 ? 0 : tickSize.length - point - 1
}

/**
 * Prices in cents, like Polymarket: 0.57 → "57¢". A market that ticks in
 * thousandths keeps its extra digit: 0.045 → "4.5¢".
 */
export function formatPrice(value: number | null, decimals: number): string {
  if (value === null) return '–'
  return `${(value * 100).toFixed(Math.max(0, decimals - 2))}¢`
}

export function spread(
  bid: number | null,
  ask: number | null,
  decimals: number,
): number | null {
  if (bid === null || ask === null) return null
  return Number((ask - bid).toFixed(decimals))
}
