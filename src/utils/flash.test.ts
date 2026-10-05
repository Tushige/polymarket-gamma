import { expect, test, vi } from 'vitest'
import { flash, FLASH_MS, flashDirection } from './flash'

function stubChip() {
  const cancels: (() => void)[] = []
  const animate = vi.fn(
    (_keyframes: Keyframe[], _options: KeyframeAnimationOptions) => {
      const cancel = vi.fn()
      cancels.push(cancel)
      return { cancel } as unknown as Animation
    },
  )
  const arrow = { animate }
  const chip = {
    dataset: {} as DOMStringMap,
    animate,
    querySelector: () => arrow,
  } as unknown as HTMLElement
  return { chip, animate, cancels }
}

test('the highlight lasts 500 ms in total and ends transparent', () => {
  const { chip, animate } = stubChip()

  flash(chip, 'up')

  expect(FLASH_MS).toBe(500)
  const [tintFrames, tintOptions] = animate.mock.calls[0] ?? []
  expect(tintOptions).toMatchObject({ duration: 500 })
  expect(tintFrames?.at(-1)).toEqual({ backgroundColor: 'transparent' })
  const [, arrowOptions] = animate.mock.calls[1] ?? []
  expect(arrowOptions).toMatchObject({ duration: 500 })
  expect(chip.dataset.dir).toBe('up')
})

test('cancelling a flash stops the tint and the arrow', () => {
  const { chip, cancels } = stubChip()

  flash(chip, 'down')?.cancel()

  expect(cancels).toHaveLength(2)
  for (const cancel of cancels) expect(cancel).toHaveBeenCalledTimes(1)
})

test('does nothing without an element', () => {
  expect(flash(null, 'up')).toBeNull()
})

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
