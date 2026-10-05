export function decimalsForTick(tickSize: string | null): number {
  if (tickSize === null) return 2
  const point = tickSize.indexOf('.')
  return point === -1 ? 0 : tickSize.length - point - 1
}

export function formatPrice(value: number | null, decimals: number): string {
  return value === null ? '-' : value.toFixed(decimals)
}

export function spread(
  bid: number | null,
  ask: number | null,
  decimals: number,
): number | null {
  if (bid === null || ask === null) return null
  return Number((ask - bid).toFixed(decimals))
}
