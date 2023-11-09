import { TableMap, parseFont, readTable } from './parser.js'
import { Reader } from './tables/buffer.js'
import { readGlyf } from './tables/glyf.js'
import { readLocaTable } from './tables/loca.js'
import { TableRecord } from './types.js'
import { assert } from './utils.js'

export class Font {
  public readonly sfntVersion: number
  #data: ArrayBuffer
  #tables: Record<string, TableRecord>

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
    const table = this.#tables[tag]
    if (!table) throw new Error(`table ${tag} not found`)

    return readTable(this.#data, table) as any
  }

  public getTableReader(tag: string): Reader {
    const table = this.#tables[tag]
    if (!table) throw new Error(`table ${tag} not found`)
    return new Reader(this.#data, table.offset, table.length)
  }

  public getGlyph(index: number) {
    const headTable = this.getTable('head')
    const maxpTable = this.getTable('maxp')

    const numGlyphs = maxpTable.numGlyphs
    const locaTable = readLocaTable(
      this.getTableReader('loca'),
      headTable.indexToLocFormat,
      numGlyphs,
    )

    assert(
      locaTable.length === numGlyphs + 1,
      `expected loca table length ${numGlyphs + 1}, got ${locaTable.length}`,
    )

    const glyfTableRecord = this.#tables['glyf']

    const offset = locaTable[index]

    let nextOffset = offset
    let next = index
    while (nextOffset === offset) {
      nextOffset = locaTable[++next]
    }

    const length = nextOffset - offset
    const view = new Reader(this.#data, glyfTableRecord.offset + offset, length)

    return readGlyf(view)
  }

  public *glyphs() {
    const headTable = this.getTable('head')
    const maxpTable = this.getTable('maxp')

    const numGlyphs = maxpTable.numGlyphs
    const locaTable = readLocaTable(
      this.getTableReader('loca'),
      headTable.indexToLocFormat,
      numGlyphs,
    )

    assert(
      locaTable.length === numGlyphs + 1,
      `expected loca table length ${numGlyphs + 1}, got ${locaTable.length}`,
    )

    const glyfTableRecord = this.#tables['glyf']

    for (let i = 0; i < numGlyphs; ++i) {
      const offset = locaTable[i]

      let nextOffset = offset
      let next = i
      while (nextOffset === offset) {
        nextOffset = locaTable[++next]
      }

      const length = nextOffset - offset
      const view = new Reader(
        this.#data,
        glyfTableRecord.offset + offset,
        length,
      )

      yield readGlyf(view)
    }
  }
}
