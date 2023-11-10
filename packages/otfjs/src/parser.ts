import { Reader } from './tables/buffer.js'
import { CmapTable, readCmapTable } from './tables/cmap.js'
import { HeadTable, readHeadTable } from './tables/head.js'
import { readLocaTable } from './tables/loca.js'
import { MaxpTable, readMaxpTable } from './tables/maxp.js'
import { NameTable, readNameTable } from './tables/name.js'
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

  /*
  const headTable = readTable(data, tablesByTag['head'])
  console.log(headTable)

  const cmapTable = readTable(data, tablesByTag['cmap'])
  console.log(cmapTable)
  */
}

export function readTable(data: ArrayBuffer, table: TableRecord) {
  const view = new Reader(data, table.offset, table.length)

  switch (table.tag) {
    case 'cmap':
      return readCmapTable(view)
    case 'head':
      return readHeadTable(view)
    case 'loca': {
      // TODO: how does this one get the right info?
      // might not mkae sense to just read all the tables blindly at this point
      return readLocaTable(view)
    }
    case 'maxp':
      return readMaxpTable(view)
    case 'name':
      return readNameTable(view)
  }
}

export interface TableMap {
  cmap: CmapTable
  head: HeadTable
  maxp: MaxpTable
  name: NameTable
}