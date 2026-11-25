// cSpell:ignore segs
import { Reader, Writer } from '@otfjs/buffer'

import { PlatformId } from '../enums.js'
import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { lowerBound } from '../utils/binary-search.js'

export interface CmapTable {
  version: number
  encodingRecords: EncodingRecord[]
}

export interface EncodingRecord {
  platformId: PlatformId
  encodingId: number
  subtable: CmapSubtable
}

export type CmapSubtable =
  CmapSubtable4 | CmapSubtable12 | CmapSubtable14 | CmapSubtableRaw

export interface CmapSubtable4 {
  format: 4
  language: number
  endCodes: number[]
  startCodes: number[]
  idDeltas: number[]
  idRangeOffsets: number[]
  glyphIdArray: number[]
}

/** Segmented coverage: maps ranges of 32-bit code points to glyphs. */
export interface CmapSubtable12 {
  format: 12
  language: number
  groups: SequentialMapGroup[]
}

export interface SequentialMapGroup {
  startCharCode: number
  endCharCode: number
  /** The glyph for `startCharCode`; the rest of the range follows on. */
  startGlyphId: number
}

/**
 * Unicode variation sequences: which glyph to use for a base character
 * followed by a variation selector (e.g. U+FE0E to ask for text style).
 */
export interface CmapSubtable14 {
  format: 14
  varSelectorRecords: VariationSelectorRecord[]
}

export interface VariationSelectorRecord {
  varSelector: number
  /**
   * Base characters whose sequence with `varSelector` uses the same glyph as
   * the character alone. Null if the subtable has no such table.
   */
  defaultUVS: UnicodeRange[] | null
  /**
   * Base characters whose sequence with `varSelector` uses its own glyph.
   * Null if the subtable has no such table.
   */
  nonDefaultUVS: UVSMapping[] | null
}

export interface UnicodeRange {
  startUnicodeValue: number
  /** How many code points follow `startUnicodeValue` in the range. */
  additionalCount: number
}

export interface UVSMapping {
  unicodeValue: number
  glyphId: number
}

/**
 * A subtable in a format we don't parse yet, kept as its raw bytes so the
 * rest of the table stays readable and writes back unchanged.
 */
export interface CmapSubtableRaw {
  format: RawFormat
  data: Uint8Array
}

type RawFormat = 0 | 2 | 6 | 8 | 10 | 13

export function readCmapTable(view: Reader): CmapTable {
  const version = view.u16()
  const numTables = view.u16()

  // Records often point at the same subtable, e.g. (0, 3) and (3, 1), so
  // parse each offset once and share the result.
  const subtables = new Map<number, CmapSubtable>()

  const encodingRecords = view.array(numTables, () => {
    const platformId = view.u16()
    const encodingId = view.u16()
    const offset = view.u32()
    let subtable = subtables.get(offset)
    if (!subtable) {
      subtable = readCmapSubtable(view.subtable(offset))
      subtables.set(offset, subtable)
    }
    return { platformId, encodingId, subtable }
  })

  return { version, encodingRecords }
}

/**
 * Records with the same subtable, or byte-identical ones, share a single
 * copy of it, as fonts usually do for (0, 3) and (3, 1).
 */
export function writeCmapTable(table: CmapTable): Uint8Array {
  const headerSize = 4 + table.encodingRecords.length * 8

  const blobs: Uint8Array[] = []
  const blobOffsets: number[] = []
  const offsetsBySubtable = new Map<CmapSubtable, number>()
  let end = headerSize

  const recordOffsets = table.encodingRecords.map(({ subtable }) => {
    let offset = offsetsBySubtable.get(subtable)
    if (offset !== undefined) return offset

    const bytes = encodeSubtable(subtable)
    const i = blobs.findIndex((blob) => bytesEqual(blob, bytes))
    if (i === -1) {
      offset = end
      blobs.push(bytes)
      blobOffsets.push(offset)
      end += bytes.byteLength
    } else {
      offset = blobOffsets[i]
    }

    offsetsBySubtable.set(subtable, offset)
    return offset
  })

  const w = new Writer(end)

  w.u16(table.version)
  w.u16(table.encodingRecords.length)
  table.encodingRecords.forEach((r, i) => {
    w.u16(r.platformId)
    w.u16(r.encodingId)
    w.u32(recordOffsets[i])
  })

  for (const blob of blobs) w.buffer(blob)

  return w.toBuffer()
}

/**
 * The glyph a subtable maps `codePoint` to, or 0 (`.notdef`) if it doesn't
 * map it. Subtables in unparsed formats map nothing.
 */
export function lookupCmapSubtable(
  subtable: CmapSubtable,
  codePoint: number,
): number {
  switch (subtable.format) {
    case 4:
      return lookupSubtable4(subtable, codePoint)
    case 12:
      return lookupSubtable12(subtable, codePoint)
    default:
      return 0
  }
}

export const CmapTag = 'cmap'

export const CmapTableReader: TableReader<CmapTable> = {
  tag: CmapTag,
  read: readCmapTable,
}

export const CmapTableWriter: TableWriter<CmapTable> = {
  tag: CmapTag,
  write: writeCmapTable,
}

function getSubtableSize(subtable: CmapSubtable): number {
  switch (subtable.format) {
    case 4:
      return (
        16 + subtable.endCodes.length * 8 + subtable.glyphIdArray.length * 2
      )
    case 12:
      return 16 + subtable.groups.length * 12
    case 14:
      return getSubtable14Size(subtable)
    default:
      return subtable.data.byteLength
  }
}

function encodeSubtable(subtable: CmapSubtable): Uint8Array {
  const w = new Writer(getSubtableSize(subtable))
  writeSubtable(w, subtable)
  return w.toBuffer()
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false
  for (let i = 0; i < a.byteLength; ++i) if (a[i] !== b[i]) return false
  return true
}

function writeSubtable(w: Writer, subtable: CmapSubtable): void {
  switch (subtable.format) {
    case 4:
      return writeSubtable4(w, subtable)
    case 12:
      return writeSubtable12(w, subtable)
    case 14:
      return writeSubtable14(w, subtable)
    default:
      w.buffer(subtable.data)
  }
}

function writeSubtable4(w: Writer, subtable: CmapSubtable4): void {
  const segs = subtable.endCodes.length
  const segCountX2 = segs * 2
  const searchRange = 2 * 2 ** Math.floor(Math.log2(segs))
  const entrySelector = Math.log2(searchRange / 2)
  const rangeShift = segCountX2 - searchRange

  w.u16(subtable.format)
  w.u16(getSubtableSize(subtable))
  w.u16(subtable.language)
  w.u16(segCountX2)
  w.u16(searchRange)
  w.u16(entrySelector)
  w.u16(rangeShift)

  w.array('u16', subtable.endCodes)
  w.u16(0) // reserved padding
  w.array('u16', subtable.startCodes)
  w.array('i16', subtable.idDeltas)
  w.array('u16', subtable.idRangeOffsets)
  w.array('u16', subtable.glyphIdArray)
}

function writeSubtable12(w: Writer, subtable: CmapSubtable12): void {
  w.u16(subtable.format)
  w.u16(0) // reserved
  w.u32(getSubtableSize(subtable))
  w.u32(subtable.language)
  w.u32(subtable.groups.length)

  for (const group of subtable.groups) {
    w.u32(group.startCharCode)
    w.u32(group.endCharCode)
    w.u32(group.startGlyphId)
  }
}

function getSubtable14Size(subtable: CmapSubtable14): number {
  let size = 10 + subtable.varSelectorRecords.length * 11
  for (const record of subtable.varSelectorRecords) {
    if (record.defaultUVS) size += 4 + record.defaultUVS.length * 4
    if (record.nonDefaultUVS) size += 4 + record.nonDefaultUVS.length * 5
  }
  return size
}

function writeSubtable14(w: Writer, subtable: CmapSubtable14): void {
  const { varSelectorRecords } = subtable

  w.u16(subtable.format)
  w.u32(getSubtable14Size(subtable))
  w.u32(varSelectorRecords.length)

  // The UVS tables follow the records, with offsets from the subtable start.
  let offset = 10 + varSelectorRecords.length * 11
  for (const record of varSelectorRecords) {
    w.u24(record.varSelector)

    if (record.defaultUVS) {
      w.u32(offset)
      offset += 4 + record.defaultUVS.length * 4
    } else {
      w.u32(0)
    }

    if (record.nonDefaultUVS) {
      w.u32(offset)
      offset += 4 + record.nonDefaultUVS.length * 5
    } else {
      w.u32(0)
    }
  }

  for (const { defaultUVS, nonDefaultUVS } of varSelectorRecords) {
    if (defaultUVS) {
      w.u32(defaultUVS.length)
      for (const range of defaultUVS) {
        w.u24(range.startUnicodeValue)
        w.u8(range.additionalCount)
      }
    }

    if (nonDefaultUVS) {
      w.u32(nonDefaultUVS.length)
      for (const mapping of nonDefaultUVS) {
        w.u24(mapping.unicodeValue)
        w.u16(mapping.glyphId)
      }
    }
  }
}

function readCmapSubtable(view: Reader): CmapSubtable {
  const format = view.u16()

  switch (format) {
    case 4: {
      const length = view.u16()
      const language = view.u16()
      const segCountX2 = view.u16()
      view.skip(6) // searchRange, entrySelector, rangeShift

      const segs = segCountX2 / 2

      const endCodes = view.array(segs, () => view.u16())
      view.skip(2) // reserved padding
      const startCodes = view.array(segs, () => view.u16())
      const idDeltas = view.array(segs, () => view.i16())
      const idRangeOffsets = view.array(segs, () => view.u16())

      const glyphIdCount = (length - 16 - segs * 8) / 2
      const glyphIdArray = view.array(glyphIdCount, () => view.u16())

      return {
        format,
        language,
        endCodes,
        startCodes,
        idDeltas,
        idRangeOffsets,
        glyphIdArray,
      }
    }

    case 12: {
      view.skip(6) // reserved, length
      const language = view.u32()
      const numGroups = view.u32()
      const groups = view.array(numGroups, () => ({
        startCharCode: view.u32(),
        endCharCode: view.u32(),
        startGlyphId: view.u32(),
      }))
      return { format, language, groups }
    }

    case 14: {
      view.skip(4) // length
      const numVarSelectorRecords = view.u32()
      const varSelectorRecords = view.array(numVarSelectorRecords, () => {
        const varSelector = view.u24()
        const defaultUVSOffset = view.u32()
        const nonDefaultUVSOffset = view.u32()

        const defaultUVS =
          defaultUVSOffset ?
            readUnicodeRanges(view.subtable(defaultUVSOffset))
          : null
        const nonDefaultUVS =
          nonDefaultUVSOffset ?
            readUVSMappings(view.subtable(nonDefaultUVSOffset))
          : null

        return { varSelector, defaultUVS, nonDefaultUVS }
      })
      return { format, varSelectorRecords }
    }

    // The remaining formats aren't parsed yet.
    case 0:
    case 2:
    case 6: {
      const length = view.u16()
      return { format, data: view.bytes(0, length) }
    }

    case 8:
    case 10:
    case 13: {
      view.skip(2) // reserved
      const length = view.u32()
      return { format, data: view.bytes(0, length) }
    }

    default:
      throw new Error(`unknown cmap subtable format ${format}`)
  }
}

function readUnicodeRanges(view: Reader): UnicodeRange[] {
  const count = view.u32()
  return view.array(count, () => ({
    startUnicodeValue: view.u24(),
    additionalCount: view.u8(),
  }))
}

function readUVSMappings(view: Reader): UVSMapping[] {
  const count = view.u32()
  return view.array(count, () => ({
    unicodeValue: view.u24(),
    glyphId: view.u16(),
  }))
}

function lookupSubtable4(s: CmapSubtable4, codePoint: number): number {
  if (codePoint > 0xffff) return 0

  const i = lowerBound(s.endCodes, codePoint, (end) => end)
  if (i === s.endCodes.length || s.startCodes[i] > codePoint) return 0

  if (s.idRangeOffsets[i] === 0) {
    return (codePoint + s.idDeltas[i]) & 0xffff
  }

  // idRangeOffset is a byte offset from its own entry in idRangeOffsets into
  // glyphIdArray, which immediately follows it.
  const glyphArrayIndex =
    s.idRangeOffsets[i] / 2 +
    (codePoint - s.startCodes[i]) +
    i -
    s.endCodes.length
  const glyphId = s.glyphIdArray[glyphArrayIndex] ?? 0
  if (glyphId === 0) return 0
  return (glyphId + s.idDeltas[i]) & 0xffff
}

function lookupSubtable12(s: CmapSubtable12, codePoint: number): number {
  const i = lowerBound(s.groups, codePoint, (g) => g.endCharCode)
  const group = s.groups[i] as SequentialMapGroup | undefined
  if (!group || group.startCharCode > codePoint) return 0
  return group.startGlyphId + (codePoint - group.startCharCode)
}
