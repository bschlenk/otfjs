import { Reader, Writer } from '@otfjs/buffer'

import { PlatformId } from '../enums.js'

export interface CmapTable {
  version: number
  encodingRecords: EncodingRecord[]
}

interface EncodingRecord {
  platformId: PlatformId
  encodingId: number
  subtable: CmapSubtable
}

type CmapSubtable = CmapSubtable4

interface CmapSubtable4 {
  format: 4
  language: number
  endCodes: number[]
  startCodes: number[]
  idDeltas: number[]
  idRangeOffsets: number[]
  glyphIdArray: number[]
}

export function getGlyphIndex(table: CmapTable, codePoint: number): number {
  const platformId = PlatformId.Windows
  const encodingId = codePoint > 0xffff ? 10 : 1

  const record = table.encodingRecords.find(
    (r) => r.platformId === platformId && r.encodingId === encodingId,
  )

  if (!record) {
    console.error(
      `Encoding record not found for platformId = ${platformId}, encodingId = ${encodingId}`,
    )
    return 0
  }

  return getGlyphIndexFormat4(record.subtable, codePoint)
}

function getGlyphIndexFormat4(subtable: CmapSubtable4, codePoint: number): number {
  let i = 0
  while (subtable.endCodes[i] < codePoint) ++i

  if (subtable.startCodes[i] > codePoint) return 0

  if (subtable.idRangeOffsets[i] === 0) {
    return (codePoint + subtable.idDeltas[i]) & 0xffff
  }

  const segCount = subtable.endCodes.length
  const glyphArrayIndex =
    subtable.idRangeOffsets[i] / 2 + (codePoint - subtable.startCodes[i]) + i - segCount
  const glyphId = subtable.glyphIdArray[glyphArrayIndex]
  if (glyphId === 0) return 0
  return (glyphId + subtable.idDeltas[i]) & 0xffff
}

export function readCmapTable(view: Reader): CmapTable {
  const version = view.u16()
  const numTables = view.u16()

  const encodingRecords = view.array(numTables, () => {
    const platformId = view.u16() as PlatformId
    const encodingId = view.u16()
    const offset = view.u32()
    const subtable = readCmapSubtable(view.subtable(offset))
    return { platformId, encodingId, subtable }
  })

  return { version, encodingRecords }
}

export function writeCmapTable(table: CmapTable): Uint8Array {
  const headerSize = 4 + table.encodingRecords.length * 8

  const subtableSizes = table.encodingRecords.map((r) => getSubtableSize(r.subtable))
  const subtableOffsets: number[] = []
  let offset = headerSize
  for (const size of subtableSizes) {
    subtableOffsets.push(offset)
    offset += size
  }

  const w = new Writer(offset)

  w.u16(table.version)
  w.u16(table.encodingRecords.length)
  table.encodingRecords.forEach((r, i) => {
    w.u16(r.platformId)
    w.u16(r.encodingId)
    w.u32(subtableOffsets[i])
  })

  for (const record of table.encodingRecords) {
    writeSubtable(w, record.subtable)
  }

  return w.toBuffer()
}

function getSubtableSize(subtable: CmapSubtable): number {
  const segs = subtable.endCodes.length
  return 16 + segs * 8 + subtable.glyphIdArray.length * 2
}

function writeSubtable(w: Writer, subtable: CmapSubtable): void {
  const segs = subtable.endCodes.length
  const segCountX2 = segs * 2
  const searchRange = 2 * 2 ** Math.floor(Math.log2(segs))
  const entrySelector = Math.log2(searchRange / 2)
  const rangeShift = segCountX2 - searchRange
  const length = 16 + segs * 8 + subtable.glyphIdArray.length * 2

  w.u16(subtable.format)
  w.u16(length)
  w.u16(subtable.language)
  w.u16(segCountX2)
  w.u16(searchRange)
  w.u16(entrySelector)
  w.u16(rangeShift)

  for (const code of subtable.endCodes) w.u16(code)
  w.u16(0) // reserved padding
  for (const code of subtable.startCodes) w.u16(code)
  for (const delta of subtable.idDeltas) w.i16(delta)
  for (const off of subtable.idRangeOffsets) w.u16(off)
  for (const id of subtable.glyphIdArray) w.u16(id)
}

function readCmapSubtable(view: Reader): CmapSubtable {
  const format = view.u16()

  switch (format) {
    case 4: {
      const length = view.u16()
      const language = view.u16()
      const segCountX2 = view.u16()
      view.u16() // searchRange
      view.u16() // entrySelector
      view.u16() // rangeShift

      const segs = segCountX2 / 2

      const endCodes = view.array(segs, () => view.u16())
      view.skip(2) // reserved padding
      const startCodes = view.array(segs, () => view.u16())
      const idDeltas = view.array(segs, () => view.i16())
      const idRangeOffsets = view.array(segs, () => view.u16())

      const glyphIdCount = (length - 16 - segs * 8) / 2
      const glyphIdArray = view.array(glyphIdCount, () => view.u16())

      return { format, language, endCodes, startCodes, idDeltas, idRangeOffsets, glyphIdArray }
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
}
