import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import {
  type CmapTable,
  CmapTableReader,
  CmapTableWriter,
  CmapTag,
} from './cmap.js'
import { CvtTableReader } from './cvt.js'
import { FpgmTableReader } from './fpgm.js'
import { HeadTableReader, HeadTableWriter } from './head.js'
import { HheaTableReader } from './hhea.js'
import { HmtxTableReader } from './hmtx.js'
import { LocaTableReader } from './loca.js'
import { MaxpTableReader } from './maxp.js'

describe('table readers', () => {
  it('hmtx reads its dependencies from hhea and maxp', () => {
    const hmtx = bytes(2 * 4 + 1 * 2, (v) => {
      v.setUint16(0, 500)
      v.setInt16(2, 10)
      v.setUint16(4, 600)
      v.setInt16(6, -20)
      v.setInt16(8, 30)
    })
    const font = new FontHandle(
      buildFont({ tables: { hhea: hhea(2), maxp: maxp(3), hmtx } }),
    )

    expect(font.readTable(HmtxTableReader)).toEqual({
      longHorMetrics: [
        { advanceWidth: 500, leftSideBearing: 10 },
        { advanceWidth: 600, leftSideBearing: -20 },
      ],
      leftSideBearings: [30],
    })
    expect(font.readTable(HheaTableReader).numberOfHMetrics).toBe(2)
    expect(font.readTable(MaxpTableReader).numGlyphs).toBe(3)
  })

  it('loca reads its dependencies from head and maxp', () => {
    const loca = bytes(3 * 2, (v) => {
      v.setUint16(0, 0)
      v.setUint16(2, 5)
      v.setUint16(4, 9)
    })
    const font = new FontHandle(
      buildFont({ tables: { head: head(0), maxp: maxp(2), loca } }),
    )

    expect(font.readTable(LocaTableReader)).toEqual([0, 10, 18])
    expect(font.readTable(HeadTableReader).unitsPerEm).toBe(1000)
  })

  it('reads head with any minorVersion or fontDirectionHint', () => {
    const data = head(0)
    const view = new DataView(data.buffer)
    view.setUint16(2, 1) // minorVersion
    view.setInt16(48, 0) // fontDirectionHint
    const font = new FontHandle(buildFont({ tables: { head: data } }))

    const table = font.readTable(HeadTableReader)
    expect(table.minorVersion).toBe(1)
    expect(table.fontDirectionHint).toBe(0)
  })

  it('writes head with default minorVersion and fontDirectionHint', () => {
    const font = new FontHandle(buildFont({ tables: { head: head(0) } }))
    const {
      minorVersion: _minor,
      fontDirectionHint: _hint,
      ...rest
    } = font.readTable(HeadTableReader)

    const written = new FontHandle(
      buildFont({ tables: { head: HeadTableWriter.write(rest) } }),
    ).readTable(HeadTableReader)
    expect(written.minorVersion).toBe(0)
    expect(written.fontDirectionHint).toBe(2)
  })

  it('reads cvt as i16s and fpgm as raw bytes', () => {
    const font = new FontHandle(
      buildFont({
        tables: {
          'cvt ': bytes(4, (v) => {
            v.setInt16(0, -1)
            v.setInt16(2, 7)
          }),
          fpgm: new Uint8Array([1, 2, 3, 4]),
        },
      }),
    )

    expect(font.readTable(CvtTableReader)).toEqual([-1, 7])
    expect([...font.readTable(FpgmTableReader)]).toEqual([1, 2, 3, 4])
  })

  it('round-trips cmap through its writer and reader', () => {
    const cmap: CmapTable = {
      version: 0,
      encodingRecords: [
        {
          platformId: 3,
          encodingId: 1,
          subtable: {
            format: 4,
            language: 0,
            endCodes: [0x41, 0xffff],
            startCodes: [0x41, 0xffff],
            idDeltas: [-0x40, 1],
            idRangeOffsets: [0, 0],
            glyphIdArray: [],
          },
        },
      ],
    }

    const data = CmapTableWriter.write(cmap)
    const font = new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
    expect(font.readTable(CmapTableReader)).toEqual(cmap)
  })

  it('keeps cmap subtables in unparsed formats as raw bytes', () => {
    // A format 6 (trimmed table) subtable mapping 'A' to glyph 1.
    const format6 = bytes(12, (v) => {
      v.setUint16(0, 6) // format
      v.setUint16(2, 12) // length
      v.setUint16(4, 0) // language
      v.setUint16(6, 0x41) // firstCode
      v.setUint16(8, 1) // entryCount
      v.setUint16(10, 1) // glyphIdArray[0]
    })
    // A format 13 (many-to-one) subtable with no groups.
    const format13 = bytes(16, (v) => {
      v.setUint16(0, 13) // format
      v.setUint32(4, 16) // length
    })
    const cmap: CmapTable = {
      version: 0,
      encodingRecords: [
        {
          platformId: 1,
          encodingId: 0,
          subtable: { format: 6, data: format6 },
        },
        {
          platformId: 0,
          encodingId: 6,
          subtable: { format: 13, data: format13 },
        },
      ],
    }

    const data = CmapTableWriter.write(cmap)
    const font = new FontHandle(buildFont({ tables: { [CmapTag]: data } }))
    expect(font.readTable(CmapTableReader)).toEqual(cmap)
  })
})

function bytes(size: number, fill: (view: DataView) => void) {
  const data = new Uint8Array(size)
  fill(new DataView(data.buffer))
  return data
}

function maxp(numGlyphs: number) {
  return bytes(6, (v) => {
    v.setUint32(0, 0x00005000)
    v.setUint16(4, numGlyphs)
  })
}

function hhea(numberOfHMetrics: number) {
  return bytes(36, (v) => {
    v.setUint32(0, 0x00010000)
    v.setUint16(34, numberOfHMetrics)
  })
}

function head(indexToLocFormat: number) {
  return bytes(54, (v) => {
    v.setUint16(0, 1)
    v.setUint32(12, 0x5f0f3cf5)
    v.setUint16(18, 1000)
    v.setInt16(48, 2)
    v.setInt16(50, indexToLocFormat)
  })
}
