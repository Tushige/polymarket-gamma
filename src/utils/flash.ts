export type Direction = 'up' | 'down'
const FLASH_MS = 500

export function flashDirection(
  previous: number | null,
  next: number | null,
): Direction | null {
  if (previous === null || next === null || previous === next) {
    return null
  }
  return next > previous ? 'up' : 'down'
}

export function flash(
  element: HTMLElement | null,
  direction: Direction,
): Animation | null {
  if (element === null) return null
  return element.animate(
    [
      { backgroundColor: `var(--flash-${direction})` },
      { backgroundColor: 'transparent' },
    ],
    { duration: FLASH_MS, easing: 'ease-out' },
  )
}
