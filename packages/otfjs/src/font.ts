import { parseFont, readTable } from './parser.js'
import { TableRecord } from './types.js'

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

  get tables() {
    return Object.keys(this.#tables)
  }

  getTable(tag: string) {
    const table = this.#tables[tag]
    if (!table) throw new Error(`Table ${tag} not found`)

    return readTable(this.#data, table)
  }
}
