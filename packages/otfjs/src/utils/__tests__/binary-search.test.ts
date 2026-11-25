import { describe, expect, it } from 'vitest'

import { lowerBound } from '../binary-search.js'

describe('lowerBound', () => {
  const items = [2, 4, 4, 8]
  const key = (n: number) => n

  it('finds the first item at least the target', () => {
    expect(lowerBound(items, 4, key)).toBe(1)
    expect(lowerBound(items, 5, key)).toBe(3)
  })

  it('returns 0 for targets before every item', () => {
    expect(lowerBound(items, 1, key)).toBe(0)
  })

  it('returns the length for targets past every item', () => {
    expect(lowerBound(items, 9, key)).toBe(4)
    expect(lowerBound([], 1, key)).toBe(0)
  })
})
