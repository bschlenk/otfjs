import { PlatformId } from '../enums.js'
import { Reader } from './buffer.js'

export class CmapTable {
  constructor(
    private view: Reader,
    /** Table version number (0). */
    public readonly version: number,
    /** Number of encoding tables that follow. */
    public readonly encodingRecords: EncodingRecord[],
  ) {}

  public getGlyphIndex(
    platformId: PlatformId,
    encodingId: number,
    codePoint: number,
  ) {
    if (codePoint > 0xffff) throw new Error('Codepoint out of range')

    const record = this.encodingRecords.find(
      (record) =>
        record.platformId === platformId && record.encodingId === encodingId,
    )

    // TODO: throw?
    if (!record) {
      console.error(
        `Encoding record not found for platformId = ${platformId}, encodingId = ${encodingId}`,
      )
      return 0
    }

    const subtableView = this.view.subtable(record.offset)
    const subtable = readCmapSubtable(subtableView)

    let i = 0
    while (subtable.endCodes![i] < codePoint) ++i

    // Codepoint is out of range, return 0 (missing glyph)
    if (subtable.startCodes![i] > codePoint) return 0

    if (subtable.idRangeOffsets![i] === 0) {
      return (codePoint + subtable.idDeltas![i]) & 0xffff
    }

    const glyphIndexOffset =
      subtable.idRangeOffsets![i] + (codePoint - subtable.startCodes![i]) * 2

    // need to start from the offset of idRangeOffsets[i], which is going to be
    // the start of the glyphIdArray - segCountX2 + i * 2

    return subtableView.u16(
      subtableView.offset + glyphIndexOffset - subtable.segCountX2! + i * 2,
    )
  }
}

interface EncodingRecord {
  /** Platform ID. */
  platformId: PlatformId
  /** Platform-specific encoding ID. */
  encodingId: number
  /** Byte offset from beginning of table to the subtable for this encoding. */
  offset: number

  // subtable: CmapSubtable
}

type CmapSubtable = any

export function readCmapTable(view: Reader) {
  const version = view.u16()
  const numTables = view.u16()

  const encodingRecords = view.array(numTables, () => {
    const platformId = view.u16()
    const encodingId = view.u16()
    const subtableOffset = view.u32()

    const encodingRecord: EncodingRecord = {
      platformId,
      encodingId,
      offset: subtableOffset,
      // subtable,
    }

    return encodingRecord
  })

  return new CmapTable(view, version, encodingRecords)
}

function readCmapSubtable(view: Reader) {
  const format = view.u16()
  console.log('format', format)

  switch (format) {
    case 0: {
      // Byte encoding table
      // TODO: not commonly used
      break
    }

    case 2: {
      // High-byte mapping through table
      break
    }

    case 4: {
      // Segment mapping to delta values
      const length = view.u16()
      const language = view.u16()
      const segCountX2 = view.u16()
      const searchRange = view.u16()
      const entrySelector = view.u16()
      const rangeShift = view.u16()

      const segs = segCountX2 / 2

      const endCodes = view.array(segs, () => view.u16())
      view.skip(2) // reserved padding

      const startCodes = view.array(segs, () => view.u16())
      const idDeltas = view.array(segs, () => view.i16())
      const idRangeOffsets = view.array(segs, () => view.u16())

      /*
      for (let i = 0; i < segs; ++i) {
        const start = toHex(startCodes[i])
        const end = toHex(endCodes[i])
        const delta = idDeltas[i]
        const offset = idRangeOffsets[i]
      }
      */

      return {
        format,
        length,
        language,
        segCountX2,
        searchRange,
        entrySelector,
        rangeShift,
        endCodes,
        startCodes,
        idDeltas,
        idRangeOffsets,
      }

      break
    }

    case 6: {
      // Trimmed table mapping
      break
    }

    case 8: {
      // Mixed 16-bit and 32-bit coverage
      break
    }

    case 10: {
      // Trimmed array
      break
    }

    case 12: {
      // Segmented coverage
      break
    }

    case 13: {
      // Many-to-one range mappings
      break
    }

    case 14: {
      // Unicode Variation Sequences
      break
    }
  }

  return { format }
}
