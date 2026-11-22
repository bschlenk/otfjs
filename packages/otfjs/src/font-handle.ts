import { asUint8Array, Reader } from '@otfjs/buffer'

import type { TableReader } from './table-reader.js'
import type { TableWriter } from './table-writer.js'
import { type Header, readHeader, type TableRecord } from './tables/header.js'
import { toObject } from './utils/utils.js'

/**
 * Owns a font's bytes, its parsed header, and a cache of parsed tables.
 *
 * FontHandle deliberately knows nothing about individual tables: pass a
 * `TableReader` to `readTable` to parse one. This keeps unused table
 * readers out of bundles. See `Font` for a batteries-included subclass.
 */
export class FontHandle {
  #data: Uint8Array
  #header: Header
  #tables: Record<string, TableRecord>
  #readCache = new Map<TableReader<unknown>, unknown>()

  constructor(data: Uint8Array) {
    this.#data = data
    this.#header = readHeader(new Reader(data))
    this.#tables = toObject(this.#header.tables, (table) => table.tag)
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

  public getTableRecord(tag: string): TableRecord | undefined {
    return this.#tables[tag]
  }

  /**
   * Read a table using the given reader, throwing if the font doesn't
   * contain the reader's table. Results are cached per reader.
   */
  public readTable<T>(reader: TableReader<T>): T {
    if (!this.hasTable(reader.tag)) {
      throw new Error(`"${reader.tag}" table not found`)
    }
    return this.readTableOrNull(reader)!
  }

  /**
   * Read a table using the given reader, returning null if the font
   * doesn't contain the reader's table. Results are cached per reader.
   */
  public readTableOrNull<T>(reader: TableReader<T>): T | null {
    if (this.#readCache.has(reader)) {
      return this.#readCache.get(reader) as T | null
    }

    const view = this.getTableView(reader.tag)
    const value = view ? reader.read(view, this) : null
    this.#readCache.set(reader, value)
    return value
  }

  public writeTable<T>(writer: TableWriter<T>, data: T): Uint8Array {
    return writer.write(data)
  }

  /**
   * Get a reader over the raw bytes of a table, or null if the font
   * doesn't contain it. Useful for tables that are read lazily, like
   * `glyf`.
   */
  public getTableView(tag: string): Reader | null {
    const table = this.#tables[tag]
    if (!table) return null
    return new Reader(asUint8Array(this.#data, table.offset, table.length))
  }
}
