import type { Reader } from '@otfjs/buffer'
import { describe, expect, it, vi } from 'vitest'

import { buildFont } from './font-builder.js'
import { FontHandle } from './font-handle.js'
import type { TableReader } from './table-reader.js'

describe('FontHandle.derive', () => {
  it('computes once per font and function', () => {
    const fn = vi.fn((font: FontHandle) => ({ size: font.size }))
    const a = makeHandle({ aaaa: [1, 2, 3, 4] })
    const b = makeHandle({ aaaa: [1, 2, 3, 4], bbbb: [5, 6, 7, 8] })

    expect(a.derive(fn)).toBe(a.derive(fn))
    expect(b.derive(fn)).not.toBe(a.derive(fn))
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('caches each function separately', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    const first = (f: FontHandle) => f.readTable(firstByteReader('aaaa'))
    const size = (f: FontHandle) => f.size
    expect(font.derive(first)).toBe(1)
    expect(font.derive(size)).toBe(font.size)
  })
})

describe('FontHandle.readTable', () => {
  it('passes the reader a view over just that table', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4], bbbb: [5, 6, 7, 8] })
    const reader = makeReader('bbbb', (view) => view.u8Array(view.length))
    expect([...font.readTable(reader)]).toEqual([5, 6, 7, 8])
  })

  it('throws when the font does not contain the table', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    expect(() => font.readTable(firstByteReader('zzzz'))).toThrow(
      '"zzzz" table not found',
    )
  })

  it('caches results per reader', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    const read = vi.fn(() => ({}))
    const reader = makeReader('aaaa', read)
    expect(font.readTable(reader)).toBe(font.readTable(reader))
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('does not share cache entries between readers of the same tag', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    const a = makeReader('aaaa', (view) => view.u8())
    const b = makeReader('aaaa', (view) => view.u16())
    expect(font.readTable(a)).toBe(1)
    expect(font.readTable(b)).toBe(0x0102)
  })

  it('lets readers depend on other tables', () => {
    const font = makeHandle({ base: [3, 0, 0, 0], dep_: [10, 20, 30, 40] })
    const base = firstByteReader('base')
    const dep = makeReader('dep_', (view, f) =>
      view.array(f.readTable(base), () => view.u8()),
    )
    expect(font.readTable(dep)).toEqual([10, 20, 30])
  })
})

describe('FontHandle.readTableOrNull', () => {
  it('returns null when the font does not contain the table', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    expect(font.readTableOrNull(firstByteReader('zzzz'))).toBeNull()
  })

  it('returns the parsed table when present', () => {
    const font = makeHandle({ aaaa: [9, 2, 3, 4] })
    expect(font.readTableOrNull(firstByteReader('aaaa'))).toBe(9)
  })
})

describe('FontHandle.getTableView', () => {
  it('returns a view over the table bytes', () => {
    const view = makeHandle({ aaaa: [1, 2, 3, 4] }).getTableView('aaaa')
    expect(view.length).toBe(4)
    expect(view.u32()).toBe(0x01020304)
  })

  it('throws for a missing table', () => {
    expect(() =>
      makeHandle({ aaaa: [1, 2, 3, 4] }).getTableView('zzzz'),
    ).toThrow('"zzzz" table not found')
  })
})

describe('FontHandle.getTableViewOrNull', () => {
  it('returns null for a missing table', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    expect(font.getTableViewOrNull('zzzz')).toBeNull()
  })
})

function makeHandle(tables: Record<string, number[]>) {
  const data = buildFont({
    tables: Object.fromEntries(
      Object.entries(tables).map(([tag, bytes]) => [
        tag,
        new Uint8Array(bytes),
      ]),
    ),
  })
  return new FontHandle(data)
}

function makeReader<T>(
  tag: string,
  read: (view: Reader, font: FontHandle) => T,
): TableReader<T> {
  return { tag, read }
}

function firstByteReader(tag: string) {
  return makeReader(tag, (view) => view.u8())
}
