import { describe, expect, it, vi } from 'vitest'

import { createCache } from './cache.js'

describe('createCache', () => {
  it('computes each key once', () => {
    const getter = vi.fn((key: string) => key.length)
    const cache = createCache(getter)
    expect(cache.get('abc')).toBe(3)
    expect(cache.get('abc')).toBe(3)
    expect(getter).toHaveBeenCalledTimes(1)
  })

  it('caches null results', () => {
    const getter = vi.fn(() => null)
    const cache = createCache(getter)
    expect(cache.get('missing')).toBeNull()
    expect(cache.get('missing')).toBeNull()
    expect(getter).toHaveBeenCalledTimes(1)
  })
})
