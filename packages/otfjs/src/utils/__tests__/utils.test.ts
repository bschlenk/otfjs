import { describe, expect, it } from 'vitest'

import { sortBy } from '../utils.js'

describe('sortBy', () => {
  it('sorts strings by code unit, so uppercase comes first', () => {
    expect(sortBy(['name', 'OS/2', 'cmap', 'GPOS'])).toEqual([
      'GPOS',
      'OS/2',
      'cmap',
      'name',
    ])
  })

  it('sorts numbers by value, not as strings', () => {
    expect(sortBy([10, 9, 100, -1])).toEqual([-1, 9, 10, 100])
  })

  it('sorts objects by a string key', () => {
    const items = [{ tag: 'slng' }, { tag: 'appl' }, { tag: 'dlng' }]
    expect(sortBy(items, 'tag')).toEqual([
      { tag: 'appl' },
      { tag: 'dlng' },
      { tag: 'slng' },
    ])
  })

  it('sorts objects by a number key', () => {
    const items = [{ glyphId: 12 }, { glyphId: 3 }, { glyphId: 100 }]
    expect(sortBy(items, 'glyphId').map((i) => i.glyphId)).toEqual([3, 12, 100])
  })

  it('sorts objects by a function', () => {
    const items = [{ name: 'b' }, { name: 'c' }, { name: 'a' }]
    expect(sortBy(items, (item) => item.name).map((i) => i.name)).toEqual([
      'a',
      'b',
      'c',
    ])
  })

  it('sorts in place and returns the same array', () => {
    const arr = ['b', 'a']
    expect(sortBy(arr)).toBe(arr)
    expect(arr).toEqual(['a', 'b'])
  })
})
