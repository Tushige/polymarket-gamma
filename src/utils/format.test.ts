import { describe, expect, test } from 'vitest'
import { decimalsForTick, formatPrice, spread } from './format'

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
  test('shows cents, like Polymarket', () => {
    expect(formatPrice(0.57, 2)).toBe('57¢')
    expect(formatPrice(0.5, 2)).toBe('50¢')
  })

  test('keeps the tick: a thousandths market shows tenths of a cent', () => {
    expect(formatPrice(0.866, 3)).toBe('86.6¢')
    expect(formatPrice(0.4, 3)).toBe('40.0¢')
    expect(formatPrice(0.999, 3)).toBe('99.9¢')
  })

  test('formats a spread the same way', () => {
    expect(formatPrice(0.01, 2)).toBe('1¢')
    expect(formatPrice(0.124, 3)).toBe('12.4¢')
  })

  test('shows a dash when there is no price', () => {
    expect(formatPrice(null, 2)).toBe('–')
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
