import { Reader } from '@otfjs/buffer'

import { isSfntVersion } from '../enum-utils.js'
import { NotAFontError } from '../errors.js'

export interface Header {
  sfntVersion: number
  numTables: number
  searchRange: number
  entrySelector: number
  rangeShift: number
  tables: TableRecord[]
}

export interface TableRecord {
  /** Table identifier. */
  tag: string
  /** Checksum for this table. */
  checksum: number
  /** Offset from beginning of font file. */
  offset: number
  /** Length of this table. */
  length: number
}

export function readHeader(view: Reader): Header {
  if (view.length < 4) throw new NotAFontError()

  const sfntVersion = view.u32()
  if (!isSfntVersion(sfntVersion)) throw new NotAFontError()

  const numTables = view.u16()
  const searchRange = view.u16()
  const entrySelector = view.u16()
  const rangeShift = view.u16()

  const tables = view.array<TableRecord>(numTables, () => ({
    tag: view.tag(),
    checksum: view.u32(),
    offset: view.u32(),
    length: view.u32(),
  }))

  return {
    sfntVersion,
    numTables,
    searchRange,
    entrySelector,
    rangeShift,
    tables,
  }
}
