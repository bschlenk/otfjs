import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import {
  type CmapSubtable4,
  type CmapSubtable12,
  type CmapSubtable14,
  type CmapTable,
  CmapTableReader,
  CmapTableWriter,
  CmapTag,
  lookupCmapSubtable,
} from './cmap.js'

describe('cmap', () => {
  it('round-trips a format 12 subtable', () => {
    const cmap: CmapTable = {
      version: 0,
      encodingRecords: [
        { platformId: 3, encodingId: 1, subtable: format4 },
        { platformId: 3, encodingId: 10, subtable: format12 },
      ],
    }

    const data = CmapTableWriter.write(cmap)
    const font = new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
    expect(font.readTable(CmapTableReader)).toEqual(cmap)
  })

  it('round-trips a format 14 subtable', () => {
    const cmap: CmapTable = {
      version: 0,
      encodingRecords: [
        { platformId: 3, encodingId: 1, subtable: format4 },
        { platformId: 0, encodingId: 5, subtable: format14 },
      ],
    }

    const data = CmapTableWriter.write(cmap)
    const font = new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
    expect(font.readTable(CmapTableReader)).toEqual(cmap)
  })

  it('writes one copy of a subtable shared by several records', () => {
    const shared: CmapTable = {
      version: 0,
      encodingRecords: [
        { platformId: 0, encodingId: 3, subtable: format4 },
        { platformId: 3, encodingId: 1, subtable: format4 },
      ],
    }
    const single: CmapTable = {
      version: 0,
      encodingRecords: [{ platformId: 3, encodingId: 1, subtable: format4 }],
    }

    const data = CmapTableWriter.write(shared)
    // Only the extra 8-byte encoding record.
    expect(data.byteLength).toBe(CmapTableWriter.write(single).byteLength + 8)

    const read = readCmap(data)
    expect(read).toEqual(shared)
    expect(read.encodingRecords[0].subtable).toBe(
      read.encodingRecords[1].subtable,
    )
  })

  it('writes one copy of byte-identical subtables', () => {
    const cmap: CmapTable = {
      version: 0,
      encodingRecords: [
        { platformId: 0, encodingId: 3, subtable: format4 },
        { platformId: 3, encodingId: 1, subtable: structuredClone(format4) },
        { platformId: 3, encodingId: 10, subtable: format12 },
      ],
    }

    const read = readCmap(CmapTableWriter.write(cmap))
    expect(read).toEqual(cmap)
    expect(read.encodingRecords[0].subtable).toBe(
      read.encodingRecords[1].subtable,
    )
    expect(read.encodingRecords[2].subtable).not.toBe(
      read.encodingRecords[0].subtable,
    )
  })

  describe('lookupCmapSubtable', () => {
    it('maps code points through idDelta in format 4', () => {
      expect(lookupCmapSubtable(format4, 0x41)).toBe(1)
      expect(lookupCmapSubtable(format4, 0x42)).toBe(2)
    })

    it('maps code points through glyphIdArray in format 4', () => {
      expect(lookupCmapSubtable(format4, 0x61)).toBe(10)
      expect(lookupCmapSubtable(format4, 0x62)).toBe(0)
      expect(lookupCmapSubtable(format4, 0x63)).toBe(12)
    })

    it('returns 0 for code points format 4 does not map', () => {
      expect(lookupCmapSubtable(format4, 0x40)).toBe(0)
      expect(lookupCmapSubtable(format4, 0x50)).toBe(0)
      expect(lookupCmapSubtable(format4, 0x1f600)).toBe(0)
    })

    it('maps code points by range in format 12', () => {
      expect(lookupCmapSubtable(format12, 0x41)).toBe(1)
      expect(lookupCmapSubtable(format12, 0x42)).toBe(2)
      expect(lookupCmapSubtable(format12, 0x1f600)).toBe(100)
      expect(lookupCmapSubtable(format12, 0x1f601)).toBe(101)
    })

    it('returns 0 for code points format 12 does not map', () => {
      expect(lookupCmapSubtable(format12, 0x40)).toBe(0)
      expect(lookupCmapSubtable(format12, 0x43)).toBe(0)
      expect(lookupCmapSubtable(format12, 0x1f602)).toBe(0)
    })

    it('maps nothing through raw subtables', () => {
      const raw = { format: 6 as const, data: new Uint8Array(10) }
      expect(lookupCmapSubtable(raw, 0x41)).toBe(0)
    })
  })
})

// 'A'..'B' -> 1..2 via idDelta; 'a'..'c' -> 10, 0, 12 via glyphIdArray.
const format4: CmapSubtable4 = {
  format: 4,
  language: 0,
  startCodes: [0x41, 0x61, 0xffff],
  endCodes: [0x42, 0x63, 0xffff],
  idDeltas: [-0x40, 0, 1],
  // idRangeOffset is a byte offset from its own entry: segment 1's entry is
  // two u16s before the end of idRangeOffsets, where glyphIdArray starts.
  idRangeOffsets: [0, 4, 0],
  glyphIdArray: [10, 0, 12],
}

// 'A'..'B' -> 1..2; U+1F600..U+1F601 -> 100..101.
const format12: CmapSubtable12 = {
  format: 12,
  language: 0,
  groups: [
    { startCharCode: 0x41, endCharCode: 0x42, startGlyphId: 1 },
    { startCharCode: 0x1f600, endCharCode: 0x1f601, startGlyphId: 100 },
  ],
}

// U+FE0E (text style) uses the default glyph for U+2600..U+2602; U+FE0F
// (emoji style) has its own glyph for U+2600 and no default table.
const format14: CmapSubtable14 = {
  format: 14,
  varSelectorRecords: [
    {
      varSelector: 0xfe0e,
      defaultUVS: [{ startUnicodeValue: 0x2600, additionalCount: 2 }],
      nonDefaultUVS: null,
    },
    {
      varSelector: 0xfe0f,
      defaultUVS: null,
      nonDefaultUVS: [{ unicodeValue: 0x2600, glyphId: 42 }],
    },
  ],
}

function readCmap(data: Uint8Array) {
  const font = new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
  return font.readTable(CmapTableReader)
}
