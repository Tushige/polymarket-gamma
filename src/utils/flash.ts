export type Direction = 'up' | 'down'

/** The brief (W9): the highlight auto-fades after 500 ms. Nothing may extend it. */
export const FLASH_MS = 500

export function flashDirection(
  previous: number | null,
  next: number | null,
): Direction | null {
  if (previous === null || next === null || previous === next) {
    return null
  }
  return next > previous ? 'up' : 'down'
}

export interface Flash {
  cancel(): void
}

/**
 * Tints the price chip green (up) or pink (down), shows its arrow, and fades
 * both out within FLASH_MS. The colour returns to the cell's own colour
 * because the last keyframe leaves `color` unset.
 */
export function flash(
  chip: HTMLElement | null,
  direction: Direction,
): Flash | null {
  if (chip === null) return null
  chip.dataset.dir = direction
  const timing = { duration: FLASH_MS, easing: 'ease-out' }
  const tint = chip.animate(
    [
      {
        backgroundColor: `var(--${direction}-soft)`,
        color: `var(--${direction})`,
      },
      { backgroundColor: 'transparent' },
    ],
    timing,
  )
  const arrow = chip
    .querySelector('[data-arrow]')
    ?.animate([{ opacity: 1 }, { opacity: 0 }], timing)
  return {
    cancel() {
      tint.cancel()
      arrow?.cancel()
    },
  }
}
