import { expect, test } from 'vitest'
import { readStoredTheme, resolveTheme } from './theme.ts'

test('a stored choice wins; otherwise the OS decides', () => {
  expect(resolveTheme('light', true)).toBe('light')
  expect(resolveTheme('dark', false)).toBe('dark')
  expect(resolveTheme(null, true)).toBe('dark')
  expect(resolveTheme(null, false)).toBe('light')
})

test('reading the stored theme never throws, even without storage', () => {
  // Node has no localStorage: the read fails inside the try and gives null.
  expect(readStoredTheme()).toBeNull()
})
