import { Reader } from './buffer.js'
import { Header, TableRecord } from './types.js'
import { validateHeader } from './validation.js'

export function parseFont(data: ArrayBuffer) {
  const view = new Reader(data)

  const sfntVersion = view.u32()
  const numTables = view.u16()
  const searchRange = view.u16()
  const entrySelector = view.u16()
  const rangeShift = view.u16()

  const header: Header = {
    sfntVersion,
    numTables,
    searchRange,
    entrySelector,
    rangeShift,
  }

  validateHeader(header)
  console.log(header)

  // loop over table records
  const tables = view.array(numTables, () => {
    const tag = view.tag()
    const checksum = view.u32()
    const offset = view.u32()
    const length = view.u32()

    const tableRecord: TableRecord = { tag, checksum, offset, length }
    console.log(tableRecord)

    // validateTable(data, tableRecord)

    return tableRecord
  })

  return { header, tables }
}
