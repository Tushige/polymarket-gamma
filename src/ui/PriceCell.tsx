import { memo, useEffect, useRef } from 'react'
import { formatPrice } from '../utils/format'
import { flash, flashDirection, type Direction } from '../utils/flash'
import styles from './PriceCell.module.css'

const ROLL_EASE = 'cubic-bezier(.2,.8,.2,1)'

/** The old number slides out and the new one slides in, in the direction it moved. */
function roll(
  depart: HTMLElement | null,
  current: HTMLElement | null,
  oldText: string,
  direction: Direction,
): Animation[] {
  if (depart === null || current === null) return []
  const sign = direction === 'up' ? 1 : -1
  depart.textContent = oldText
  return [
    depart.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: `translateY(${-sign * 12}px)` },
      ],
      { duration: 300, easing: ROLL_EASE },
    ),
    current.animate(
      [
        { opacity: 0, transform: `translateY(${sign * 12}px)` },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 380, easing: ROLL_EASE },
    ),
  ]
}

interface PriceCellProps {
  value: number | null
  decimals: number
  /** The last-trade and spread columns are styled a little differently. */
  variant?: 'last' | 'spread'
}

/** One price. Re-renders only when its value, decimals or variant change. */
export const PriceCell = memo(function PriceCell({
  value,
  decimals,
  variant,
}: PriceCellProps) {
  const chip = useRef<HTMLSpanElement>(null)
  const depart = useRef<HTMLSpanElement>(null)
  const current = useRef<HTMLSpanElement>(null)
  const text = formatPrice(value, decimals)
  // Initialised to the first value, so a first value never flashes.
  const previous = useRef(value)
  const previousText = useRef(text)

  useEffect(() => {
    const direction = flashDirection(previous.current, value)
    const oldText = previousText.current
    previous.current = value
    previousText.current = text
    if (direction === null) return
    const highlight = flash(chip.current, direction)
    const rolls = roll(depart.current, current.current, oldText, direction)
    // A newer value, or the row going away, ends this flash and roll early.
    return () => {
      highlight?.cancel()
      for (const animation of rolls) animation.cancel()
    }
  }, [value, text])

  return (
    <td
      className={
        variant === undefined
          ? styles.cell
          : `${styles.cell} ${styles[variant]}`
      }
    >
      <span className={styles.chip} ref={chip}>
        <svg
          className={styles.arrow}
          viewBox="0 0 24 24"
          aria-hidden="true"
          data-arrow
        >
          <path className={styles.up} d="M12 19V5M5 12l7-7 7 7" />
          <path className={styles.down} d="M12 5v14M19 12l-7 7-7-7" />
        </svg>
        <span className={styles.value}>
          {/* React never renders children here; the roll sets its text. */}
          <span className={styles.departing} ref={depart} aria-hidden="true" />
          <span className={styles.current} ref={current} data-testid="price">
            {text}
          </span>
        </span>
      </span>
    </td>
  )
})
