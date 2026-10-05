import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** Lets the quote store's animation-frame flush run. */
export async function nextFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  })
}

/** Test DOMs do not implement element.animate, which the flash uses. */
export function stubElementAnimate() {
  Element.prototype.animate = vi.fn(
    () => ({ cancel: () => {} }) as unknown as Animation,
  )
}
