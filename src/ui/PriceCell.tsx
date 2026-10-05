import { memo, useEffect, useRef } from 'react'
import { formatPrice } from '../utils/format'
import { flash, flashDirection } from '../utils/flash'

interface PriceCellProps {
  value: number | null
  decimals: number
}

export const PriceCell = memo(function PriceCell({
  value,
  decimals,
}: PriceCellProps) {
  const cell = useRef<HTMLTableCellElement>(null)
  const previous = useRef(value)
  useEffect(() => {
    const direction = flashDirection(previous.current, value)
    previous.current = value
    if (direction === null) return
    const animation = flash(cell.current, direction)
    return () => {
      animation?.cancel()
    }
  }, [value])
  return <td ref={cell}>{formatPrice(value, decimals)}</td>
})
