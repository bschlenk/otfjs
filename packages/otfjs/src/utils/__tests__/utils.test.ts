import { describe, expect, it } from 'vitest'

import { sortByString } from '../utils.js'

describe('sortByString', () => {
  it('sorts strings by code unit, so uppercase comes first', () => {
    expect(sortByString(['name', 'OS/2', 'cmap', 'GPOS'])).toEqual([
      'GPOS',
      'OS/2',
      'cmap',
      'name',
    ])
  })

  it('sorts objects by a key', () => {
    const items = [{ tag: 'slng' }, { tag: 'appl' }, { tag: 'dlng' }]
    expect(sortByString(items, 'tag')).toEqual([
      { tag: 'appl' },
      { tag: 'dlng' },
      { tag: 'slng' },
    ])
  })

  it('sorts objects by a function', () => {
    const items = [{ name: 'b' }, { name: 'c' }, { name: 'a' }]
    expect(sortByString(items, (item) => item.name).map((i) => i.name)).toEqual(
      ['a', 'b', 'c'],
    )
  })

  it('sorts in place and returns the same array', () => {
    const arr = ['b', 'a']
    expect(sortByString(arr)).toBe(arr)
    expect(arr).toEqual(['a', 'b'])
  })
})
