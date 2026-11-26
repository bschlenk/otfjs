// Helpers shared by tests. Not exported from the package.

import { expect } from 'vitest'

/** Expect `point` to be within `digits` decimal places of (x, y). */
export function expectPointCloseTo(
  point: { x: number; y: number },
  x: number,
  y: number,
  digits = 3,
) {
  expect(point.x).toBeCloseTo(x, digits)
  expect(point.y).toBeCloseTo(y, digits)
}
