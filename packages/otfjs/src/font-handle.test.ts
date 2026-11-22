import { describe, expect, it, vi } from 'vitest'

import { buildFont } from './font-builder.js'
import { FontHandle } from './font-handle.js'
import { readerFor } from './table-reader.js'
import { writerFor } from './table-writer.js'

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

const firstByteReader = (tag: string) => readerFor(tag, (view) => view.u8())

describe('FontHandle.readTable', () => {
  it('passes the reader a view over just that table', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4], bbbb: [5, 6, 7, 8] })
    const reader = readerFor('bbbb', (view) => view.u8Array(view.length))
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
    const reader = readerFor('aaaa', read)
    expect(font.readTable(reader)).toBe(font.readTable(reader))
    expect(read).toHaveBeenCalledTimes(1)
  })

  it('does not share cache entries between readers of the same tag', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    const a = readerFor('aaaa', (view) => view.u8())
    const b = readerFor('aaaa', (view) => view.u16())
    expect(font.readTable(a)).toBe(1)
    expect(font.readTable(b)).toBe(0x0102)
  })

  it('lets readers depend on other tables', () => {
    const font = makeHandle({ base: [3, 0, 0, 0], dep_: [10, 20, 30, 40] })
    const base = firstByteReader('base')
    const dep = readerFor('dep_', (view, f) =>
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

describe('FontHandle.writeTable', () => {
  it('delegates to the writer', () => {
    const font = makeHandle({ aaaa: [1, 2, 3, 4] })
    const writer = writerFor('aaaa', (n: number) => new Uint8Array([n]))
    expect([...font.writeTable(writer, 7)]).toEqual([7])
  })
})

describe('FontHandle.getTableView', () => {
  it('returns null for a missing table', () => {
    expect(makeHandle({ aaaa: [1, 2, 3, 4] }).getTableView('zzzz')).toBeNull()
  })

  it('returns a view over the table bytes', () => {
    const view = makeHandle({ aaaa: [1, 2, 3, 4] }).getTableView('aaaa')!
    expect(view.length).toBe(4)
    expect(view.u32()).toBe(0x01020304)
  })
})
