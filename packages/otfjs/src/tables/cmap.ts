import { toHex } from '../utils.js'
import { Reader } from './buffer.js'

export interface CmapTable {
  /** Table version number (0). */
  version: number
  /** Number of encoding tables that follow. */
  encodingRecords: EncodingRecord[]
}

const enum PlatformId {
  Unicode = 0,
  Macintosh = 1,
  ISO = 2,
  Windows = 3,
  Custom = 4,
}

interface EncodingRecord {
  /** Platform ID. */
  platformId: PlatformId
  /** Platform-specific encoding ID. */
  encodingId: number
  /** Byte offset from beginning of table to the subtable for this encoding. */
  offset: number
}

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
    }

    const subtable = readCmapSubtable(view.subtable(subtableOffset))
    console.log(subtable)

    return encodingRecord
  })

  const cmapTable: CmapTable = { version, encodingRecords }
  return cmapTable
}

function readCmapSubtable(view: Reader) {
  const format = view.u16()

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

      for (let i = 0; i < segs; ++i) {
        const start = toHex(startCodes[i])
        const end = toHex(endCodes[i])
        const delta = idDeltas[i]
        const offset = idRangeOffsets[i]

        console.log({ start, end, delta, offset })
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
