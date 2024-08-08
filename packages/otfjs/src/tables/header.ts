import { Reader } from '../buffer/reader.js'
import { Header, TableRecord } from '../types.js'

export function readHeader(view: Reader): Header {
  const sfntVersion = view.u32()
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
