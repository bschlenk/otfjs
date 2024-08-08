import { Reader } from '../buffer/reader.js'
import { PlatformId } from '../enums.js'

export class CmapTable {
  constructor(
    private view: Reader,
    /** Table version number (0). */
    public readonly version: number,
    /** Number of encoding tables that follow. */
    public readonly encodingRecords: EncodingRecord[],
  ) {}

  // TODO: maybe this doesn't need the params and can take a codepoint directly
  // and then determine which encoding to use based on the codepoint
  public getGlyphIndex(codePoint: number) {
    const platformId = 3
    let encodingId = 1

    if (codePoint > 0xffff) {
      encodingId = 10
    }

    const record = this.encodingRecords.find(
      (record) =>
        record.platformId === platformId && record.encodingId === encodingId,
    )

    if (!record) {
      // TODO: is it necessary to error here?
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
      subtable.idRangeOffsets![i] / 2 + (codePoint - subtable.startCodes![i])

    if (glyphIndexOffset === 0) return 0

    const thisIdRangeOffset = subtable.idRangeOffsetsStart! + i * 2

    return (
      (subtableView.subtable(thisIdRangeOffset + glyphIndexOffset * 2).u16() +
        subtable.idDeltas![i]) %
      65536
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

// type CmapSubtable = any

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

  switch (format) {
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
      const idRangeOffsetsStart = view.offset
      const idRangeOffsets = view.array(segs, () => view.u16())

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
        idRangeOffsetsStart,
      }
    }

    case 0: // Byte encoding table
    case 2: // High-byte mapping through table
    case 6: // Trimmed table mapping
    case 8: // Mixed 16-bit and 32-bit coverage
    case 10: // Trimmed array
    case 12: // Segmented coverage
    case 13: // Many-to-one range mappings
    case 14: // Unicode Variation Sequences
      throw new Error(`cmap subtable format ${format} not implemented`)

    default:
      throw new Error(`unknown cmap subtable format ${format}`)
  }

  return { format }
}
