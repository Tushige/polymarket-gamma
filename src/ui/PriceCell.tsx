import { memo } from 'react'
import { formatPrice } from '../utils/format'

interface PriceCellProps {
  value: number | null
  decimals: number
}

export const PriceCell = memo(function PriceCell({
  value,
  decimals,
}: PriceCellProps) {
  return <td>{formatPrice(value, decimals)}</td>
})
