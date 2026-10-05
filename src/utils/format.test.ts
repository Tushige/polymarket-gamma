import { describe, expect, test } from 'vitest'
import { decimalsForTick, formatPrice, spread } from './format.ts'

describe('decimalsForTick', () => {
  test('counts the digits after the point', () => {
    expect(decimalsForTick('0.1')).toBe(1)
    expect(decimalsForTick('0.01')).toBe(2)
    expect(decimalsForTick('0.001')).toBe(3)
    expect(decimalsForTick('0.0001')).toBe(4)
  })

  test('is two when the tick size is not known yet', () => {
    expect(decimalsForTick(null)).toBe(2)
  })

  test('is zero for a whole number', () => {
    expect(decimalsForTick('1')).toBe(0)
  })
})

describe('formatPrice', () => {
  test('pads to the number of decimals', () => {
    expect(formatPrice(0.5, 2)).toBe('0.50')
    expect(formatPrice(0.4, 3)).toBe('0.400')
  })

  test('keeps a third decimal on a fine-tick market', () => {
    expect(formatPrice(0.866, 3)).toBe('0.866')
  })

  test('shows a dash when there is no price', () => {
    expect(formatPrice(null, 2)).toBe('-')
  })
})

describe('spread', () => {
  test('is the best ask minus the best bid', () => {
    expect(spread(0.57, 0.58, 2)).toBe(0.01)
    expect(spread(0.866, 0.99, 3)).toBe(0.124)
  })

  test('gives equal numbers for spreads that display the same', () => {
    expect(0.58 - 0.57).not.toBe(0.41 - 0.4)

    expect(spread(0.57, 0.58, 2)).toBe(spread(0.4, 0.41, 2))
  })

  test('is null when either side is missing', () => {
    expect(spread(null, 0.58, 2)).toBeNull()
    expect(spread(0.57, null, 2)).toBeNull()
  })
})
