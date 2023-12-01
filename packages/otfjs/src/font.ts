import { Reader } from './buffer.js'
import { parseFont } from './parser.js'
import { CmapTable, readCmapTable } from './tables/cmap.js'
import { readTableAsU8Array } from './tables/common.js'
import { GlyphSimple, readGlyf } from './tables/glyf.js'
import { GposTable, readGposTable } from './tables/gpos.js'
import { HeadTable, readHeadTable } from './tables/head.js'
import { HheaTable, readHheaTable } from './tables/hhea.js'
import { HmtxTable, readHmtxTable } from './tables/hmtx.js'
import { LocaTable, readLocaTable } from './tables/loca.js'
import { MaxpTable, readMaxpTable } from './tables/maxp.js'
import { NameTable, readNameTable } from './tables/name.js'
import { OS2Table, readOS2Table } from './tables/os-2.js'
import { PostTable, readPostTable } from './tables/post.js'
import { TableRecord } from './types.js'
import { toObject } from './utils.js'
import { validateHeader, validateTable } from './validation.js'

export interface TableMap {
  cmap: CmapTable
  fpgm: Uint8Array
  GPOS: GposTable
  head: HeadTable
  hhea: HheaTable
  hmtx: HmtxTable
  loca: LocaTable
  maxp: MaxpTable
  name: NameTable
  'OS/2': OS2Table
  post: PostTable
  prep: Uint8Array
}

export class Font {
  public readonly sfntVersion: number
  #data: ArrayBuffer
  #tables: Record<string, TableRecord>
  #tableCache = new Map<string, any>()

  constructor(data: ArrayBuffer) {
    this.#data = data

    const { header, tables } = parseFont(data)
    validateHeader(header)
    for (const table of tables) {
      validateTable(data, table)
    }

    this.sfntVersion = header.sfntVersion
    this.#tables = toObject(tables, (table) => table.tag)
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

  public get numGlyphs() {
    return this.getTable('maxp').numGlyphs
  }

  public getGlyph(index: number): GlyphSimple {
    const locaTable = this.getTable('loca')
    const offset = locaTable[index]
    const length = locaTable[index + 1] - offset

    const glyfTableRecord = this.#tables['glyf']
    const view = new Reader(this.#data, glyfTableRecord.offset + offset, length)

    const glyph = readGlyf(view)
    if (glyph.type === 'simple') return glyph

    const { components, ...rest } = glyph
    const fullGlyph: GlyphSimple = {
      ...rest,
      type: 'simple',
      contoursOverlap: components[0].flags.overlapCompound,
      points: [],
      endPtsOfContours: [],
      instructions: new Uint8Array(0),
    }

    for (const c of components) {
      const subGlyph = this.getGlyph(c.glyphIndex)
      fullGlyph.endPtsOfContours.push(
        ...subGlyph.endPtsOfContours.map((i) => i + fullGlyph.points.length),
      )

      if (c.flags.argsAreXYValues) {
        const roundXYToGrid = c.flags.roundXYToGrid
        fullGlyph.points.push(
          ...subGlyph.points.map((p) => {
            const point = c.matrix.transformPoint(p)
            if (roundXYToGrid) {
              point.x = Math.round(point.x)
              point.y = Math.round(point.y)
            }
            return { ...p, ...point }
          }),
        )
      } else {
        fullGlyph.points.push(...subGlyph.points)
      }

      // TODO: probably need to include lsb and rsb in glyph so we can use the metrics of a
      // component rather than always looking in the hmtx table
      // const useMyMetrics = c.flags.useMyMetrics
    }

    if (components[0].flags.weHaveInstructions) {
      const numInstructions = view.u16()
      fullGlyph.instructions = view.u8Array(numInstructions)
    }

    return fullGlyph
  }

  public *glyphs() {
    const numGlyphs = this.numGlyphs
    for (let i = 0; i < numGlyphs; ++i) {
      yield this.getGlyph(i)
    }
  }

  private readTable(table: TableRecord) {
    const view = new Reader(this.#data, table.offset, table.length)

    switch (table.tag) {
      case 'cmap':
        return readCmapTable(view)
      case 'fpgm':
        return readTableAsU8Array(view)
      case 'GPOS':
        return readGposTable(view)
      case 'head':
        return readHeadTable(view)
      case 'hhea':
        return readHheaTable(view)
      case 'hmtx': {
        const hhea = this.getTable('hhea')
        return readHmtxTable(view, hhea.numberOfHMetrics, this.numGlyphs)
      }
      case 'loca': {
        const head = this.getTable('head')
        return readLocaTable(view, head.indexToLocFormat, this.numGlyphs)
      }
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
