import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import {
  type CmapSubtable,
  type CmapSubtable4,
  type CmapSubtable12,
  CmapTableWriter,
  CmapTag,
} from '../tables/cmap.js'
import { getGlyphIndex } from './get-glyph-index.js'

describe('getGlyphIndex', () => {
  it('returns 0 for unmapped code points', () => {
    const font = makeFont([[3, 1, bmp]])
    expect(getGlyphIndex(font, 0x5a)).toBe(0)
  })

  it('finds BMP code points through a format 4 subtable', () => {
    const font = makeFont([[3, 1, bmp]])
    expect(getGlyphIndex(font, 0x41)).toBe(1)
  })

  it('returns 0 for code points above U+FFFF without a format 12 subtable', () => {
    const font = makeFont([[3, 1, bmp]])
    expect(getGlyphIndex(font, 0x1f600)).toBe(0)
  })

  it('prefers the full-repertoire subtable when there is one', () => {
    const font = makeFont([
      [3, 1, bmp],
      [3, 10, full],
    ])
    expect(getGlyphIndex(font, 0x41)).toBe(1)
    expect(getGlyphIndex(font, 0x1f600)).toBe(100)
  })

  it('uses Unicode platform subtables', () => {
    const font = makeFont([[0, 4, full]])
    expect(getGlyphIndex(font, 0x1f600)).toBe(100)
  })

  it('skips subtables in formats it cannot read', () => {
    const raw: CmapSubtable = { format: 6, data: format6(0x41, 9) }
    const font = makeFont([
      [3, 10, raw],
      [3, 1, bmp],
    ])
    expect(getGlyphIndex(font, 0x41)).toBe(1)
  })

  it('maps U+0020..U+00FF into U+F020..U+F0FF for symbol fonts', () => {
    const font = makeFont([[3, 0, symbol]])
    expect(getGlyphIndex(font, 0x21)).toBe(5)
    expect(getGlyphIndex(font, 0xf021)).toBe(5)
    expect(getGlyphIndex(font, 0x22)).toBe(0)
  })

  it('prefers the symbol subtable over Unicode ones, as HarfBuzz does', () => {
    const font = makeFont([
      [3, 1, bmp],
      [3, 0, symbol],
    ])
    expect(getGlyphIndex(font, 0x21)).toBe(5)
    expect(getGlyphIndex(font, 0x41)).toBe(0)
  })

  it('returns 0 when the font has no usable subtable', () => {
    const raw: CmapSubtable = { format: 6, data: format6(0x41, 9) }
    const font = makeFont([[1, 0, raw]])
    expect(getGlyphIndex(font, 0x41)).toBe(0)
  })
})

// 'A' -> 1.
const bmp: CmapSubtable4 = {
  format: 4,
  language: 0,
  startCodes: [0x41, 0xffff],
  endCodes: [0x41, 0xffff],
  idDeltas: [-0x40, 1],
  idRangeOffsets: [0, 0],
  glyphIdArray: [],
}

// 'A' -> 1, U+1F600 -> 100.
const full: CmapSubtable12 = {
  format: 12,
  language: 0,
  groups: [
    { startCharCode: 0x41, endCharCode: 0x41, startGlyphId: 1 },
    { startCharCode: 0x1f600, endCharCode: 0x1f600, startGlyphId: 100 },
  ],
}

// U+F021 -> 5, as in a symbol font.
const symbol: CmapSubtable4 = {
  format: 4,
  language: 0,
  startCodes: [0xf021, 0xffff],
  endCodes: [0xf021, 0xffff],
  idDeltas: [5 - 0xf021, 1],
  idRangeOffsets: [0, 0],
  glyphIdArray: [],
}

function makeFont(records: [number, number, CmapSubtable][]) {
  const data = CmapTableWriter.write({
    version: 0,
    encodingRecords: records.map(([platformId, encodingId, subtable]) => ({
      platformId,
      encodingId,
      subtable,
    })),
  })
  return new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
}

/** A format 6 subtable mapping a single code point to a glyph. */
function format6(codePoint: number, glyphId: number) {
  const data = new Uint8Array(12)
  const view = new DataView(data.buffer)
  view.setUint16(0, 6) // format
  view.setUint16(2, 12) // length
  view.setUint16(6, codePoint) // firstCode
  view.setUint16(8, 1) // entryCount
  view.setUint16(10, glyphId)
  return data
}
