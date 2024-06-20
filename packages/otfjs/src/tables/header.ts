import { Reader } from '../buffer.js'
import { Header, TableRecord } from '../types.js'

export function readHeader(view: Reader) {
  const sfntVersion = view.u32()
  const numTables = view.u16()
  const searchRange = view.u16()
  const entrySelector = view.u16()
  const rangeShift = view.u16()

  const tables = view.array(numTables, () => {
    const tag = view.tag()
    const checksum = view.u32()
    const offset = view.u32()
    const length = view.u32()

    const tableRecord: TableRecord = { tag, checksum, offset, length }
    return tableRecord
  })

  const header: Header = {
    sfntVersion,
    numTables,
    searchRange,
    entrySelector,
    rangeShift,
    tables,
  }

  return header
}
