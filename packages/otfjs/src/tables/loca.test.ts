import { describe, expect, it } from 'vitest'

import { locaFormatFor, LocaTableWriter, writeLocaTable } from './loca.js'

describe('locaFormatFor', () => {
  it('uses the short format for small even offsets', () => {
    expect(locaFormatFor([0, 4, 0x1fffe])).toBe(0)
  })

  it('uses the long format for odd offsets', () => {
    expect(locaFormatFor([0, 3])).toBe(1)
  })

  it('uses the long format for offsets too large for u16 / 2', () => {
    expect(locaFormatFor([0, 0x20000])).toBe(1)
  })
})

describe('writeLocaTable', () => {
  it('writes the short format as offsets / 2', () => {
    expect([...writeLocaTable([0, 4, 10], 0)]).toEqual([0, 0, 0, 2, 0, 5])
  })

  it('writes the long format as u32 offsets', () => {
    expect([...writeLocaTable([0, 4], 1)]).toEqual([0, 0, 0, 0, 0, 0, 0, 4])
  })

  it('refuses to write offsets that do not fit the short format', () => {
    expect(() => writeLocaTable([0, 3], 0)).toThrow()
  })

  it('LocaTableWriter picks the smallest format', () => {
    expect(LocaTableWriter.write([0, 4]).length).toBe(4)
    expect(LocaTableWriter.write([0, 3]).length).toBe(8)
  })
})
