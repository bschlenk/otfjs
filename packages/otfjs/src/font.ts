import { parseFont } from './parser.js'
import { Reader } from './buffer.js'
import { CmapTable, readCmapTable } from './tables/cmap.js'
import { readGlyf } from './tables/glyf.js'
import { HeadTable, readHeadTable } from './tables/head.js'
import { HheaTable, readHheaTable } from './tables/hhea.js'
import { HmtxTable, readHmtxTable } from './tables/hmtx.js'
import { LocaTable, readLocaTable } from './tables/loca.js'
import { MaxpTable, readMaxpTable } from './tables/maxp.js'
import { NameTable, readNameTable } from './tables/name.js'
import { TableRecord } from './types.js'
import { OS2Table, readOS2Table } from './tables/os-2.js'
import { PostTable, readPostTable } from './tables/post.js'

export interface TableMap {
  cmap: CmapTable
  head: HeadTable
  hhea: HheaTable
  hmtx: HmtxTable
  loca: LocaTable
  maxp: MaxpTable
  name: NameTable
  'OS/2': OS2Table
  post: PostTable
}

export class Font {
  public readonly sfntVersion: number
  #data: ArrayBuffer
  #tables: Record<string, TableRecord>
  #tableCache = new Map<string, any>()

  constructor(data: ArrayBuffer) {
    this.#data = data

    const { header, tables } = parseFont(data)

    this.sfntVersion = header.sfntVersion
    this.#tables = tables.reduce<Record<string, TableRecord>>((acc, table) => {
      acc[table.tag] = table
      return acc
    }, {})
  }

  public get tables() {
    return Object.keys(this.#tables)
  }

  public getTable<T extends string>(
    tag: T,
  ): T extends keyof TableMap ? TableMap[T] : any {
    let table = this.#tableCache.get(tag)

    if (!table) {
      const tableRec = this.#tables[tag]
      if (!tableRec) throw new Error(`table ${tag} not found`)

      table = this.readTable(tableRec)
      this.#tableCache.set(tag, table)
    }

    return table
  }

  public getTableReader(tag: string): Reader {
    const table = this.#tables[tag]
    if (!table) throw new Error(`table ${tag} not found`)
    return new Reader(this.#data, table.offset, table.length)
  }

  public getGlyph(index: number) {
    const locaTable = this.getTable('loca')
    const offset = locaTable[index]
    const length = locaTable[index + 1] - offset

    const glyfTableRecord = this.#tables['glyf']
    const view = new Reader(this.#data, glyfTableRecord.offset + offset, length)

    return readGlyf(view)
  }

  public *glyphs() {
    const locaTable = this.getTable('loca')
    const numGlyphs = locaTable.length - 1

    const glyfTableRecord = this.#tables['glyf']

    for (let i = 0; i < numGlyphs; ++i) {
      const offset = locaTable[i]
      const length = locaTable[i + 1] - offset

      const view = new Reader(
        this.#data,
        glyfTableRecord.offset + offset,
        length,
      )

      yield readGlyf(view)
    }
  }

  private readTable(table: TableRecord) {
    const view = new Reader(this.#data, table.offset, table.length)

    switch (table.tag) {
      case 'cmap':
        return readCmapTable(view)
      case 'head':
        return readHeadTable(view)
      case 'hhea':
        return readHheaTable(view)
      case 'hmtx':
        const hhea = this.getTable('hhea')
        const maxp = this.getTable('maxp')
        return readHmtxTable(view, hhea.numberOfHMetrics, maxp.numGlyphs)
      case 'loca': {
        const head = this.getTable('head')
        const maxp = this.getTable('maxp')
        return readLocaTable(view, head.indexToLocFormat, maxp.numGlyphs)
      }
      case 'maxp':
        return readMaxpTable(view)
      case 'name':
        return readNameTable(view)
      case 'OS/2':
        return readOS2Table(view)
      case 'post':
        return readPostTable(view)
    }
  }
}
