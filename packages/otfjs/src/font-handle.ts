import { Reader } from '@otfjs/buffer'

import { asUint8Array } from './buffer/utils.js'
import { Cache, createCache } from './cache.js'
import { CffTable, readCffTable } from './tables/cff.js'
import { CmapTable, readCmapTable } from './tables/cmap.js'
import { ColrTable, readColrTable } from './tables/colr.js'
import { readTableAsI16Array, readTableAsU8Array } from './tables/common.js'
import { CpalTable, readCpalTable } from './tables/cpal.js'
import { GposTable, readGposTable } from './tables/gpos.js'
import { HeadTable, readHeadTable } from './tables/head.js'
import { type Header, readHeader, type TableRecord } from './tables/header.js'
import { HheaTable, readHheaTable } from './tables/hhea.js'
import { HmtxTable, readHmtxTable } from './tables/hmtx.js'
import { LocaTable, readLocaTable } from './tables/loca.js'
import { MathTable, readMathTable } from './tables/math.js'
import { MaxpTable, readMaxpTable } from './tables/maxp.js'
import { NameTable, readNameTable } from './tables/name.js'
import { OS2Table, readOS2Table } from './tables/os-2.js'
import { PostTable, readPostTable } from './tables/post.js'
import { toObject } from './utils/utils.js'

export interface TableMap {
  'CFF ': CffTable
  cmap: CmapTable
  COLR: ColrTable
  CPAL: CpalTable
  'cvt ': number[]
  fpgm: Uint8Array
  GPOS: GposTable
  head: HeadTable
  hhea: HheaTable
  hmtx: HmtxTable
  loca: LocaTable
  MATH: MathTable
  maxp: MaxpTable
  name: NameTable
  'OS/2': OS2Table
  post: PostTable
  prep: Uint8Array
}

type TableType<T extends string> = T extends keyof TableMap ? TableMap[T] : unknown

export class FontHandle {
  #data: Uint8Array
  #header: Header
  #tables: Record<string, TableRecord>
  #tableCache: Cache<TableType<any>>

  constructor(data: Uint8Array) {
    this.#data = data
    this.#header = readHeader(new Reader(data))
    this.#tables = toObject(this.#header.tables, (table) => table.tag)
    this.#tableCache = createCache((tag: string) => this.readTable(tag))
  }

  public get data() {
    return this.#data
  }

  public get size(): number {
    return this.#data.length
  }

  public get sfntVersion(): number {
    return this.#header.sfntVersion
  }

  public get header(): Header {
    return this.#header
  }

  public get tables(): string[] {
    return Object.keys(this.#tables)
  }

  public hasTable(tag: string): boolean {
    return tag in this.#tables
  }

  public getTable<T extends string>(tag: T): TableType<T> {
    const table = this.getTableOrNull(tag)
    if (!table) {
      throw new Error(`"${tag}" table not found`)
    }
    return table
  }

  public getTableOrNull<T extends string>(tag: T): TableType<T> | null {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.#tableCache.get(tag)
  }

  public getTableRecord(tag: string): TableRecord | undefined {
    return this.#tables[tag]
  }

  private readTable(tag: string) {
    const table = this.#tables[tag]
    if (!table) return null

    const view = new Reader(asUint8Array(this.#data, table.offset, table.length))

    switch (table.tag) {
      case 'CFF ':
        return readCffTable(view)
      case 'cmap':
        return readCmapTable(view)
      case 'COLR':
        return readColrTable(view)
      case 'CPAL':
        return readCpalTable(view)
      case 'cvt ':
        return readTableAsI16Array(view)
      case 'fpgm':
        return readTableAsU8Array(view)
      case 'glyf':
        throw new Error('call getGlyph instead of reading the glyf table directly')
      case 'GPOS':
        return readGposTable(view)
      case 'head':
        return readHeadTable(view)
      case 'hhea':
        return readHheaTable(view)
      case 'hmtx': {
        const hhea = this.getTable('hhea')
        const maxp = this.getTable('maxp')
        return readHmtxTable(view, hhea.numberOfHMetrics, maxp.numGlyphs)
      }
      case 'loca': {
        const head = this.getTable('head')
        const maxp = this.getTable('maxp')
        return readLocaTable(view, head.indexToLocFormat, maxp.numGlyphs)
      }
      case 'MATH':
        return readMathTable(view)
      case 'maxp':
        return readMaxpTable(view)
      case 'name':
        return readNameTable(view)
      case 'OS/2':
        return readOS2Table(view)
      case 'post':
        return readPostTable(view)
      case 'prep':
        return readTableAsU8Array(view)
    }
  }
}
