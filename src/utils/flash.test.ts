import { expect, test } from 'vitest'
import { flashDirection } from './flash.ts'

test('is up when the number rises and down when it falls', () => {
  expect(flashDirection(0.57, 0.58)).toBe('up')
  expect(flashDirection(0.58, 0.57)).toBe('down')
})

test('is null when the number did not change', () => {
  expect(flashDirection(0.57, 0.57)).toBeNull()
})

test('is null for a first value: appearing is not a change of price', () => {
  expect(flashDirection(null, 0.57)).toBeNull()
})

test('is null when the value goes away', () => {
  expect(flashDirection(0.57, null)).toBeNull()
  expect(flashDirection(null, null)).toBeNull()
})
