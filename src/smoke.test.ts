import { expect, test } from 'vitest'

test('the test runner works, and floats are floats', () => {
  expect(0.58 - 0.57).not.toBe(0.01)
  expect((0.58 - 0.57).toFixed(2)).toBe('0.01')
})
