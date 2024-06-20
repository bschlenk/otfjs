import type { Extend } from './enums.js'
import type { Matrix } from './matrix.js'
import type { Vector } from './vector.js'

export interface Header {
  sfntVersion: number
  numTables: number
  searchRange: number
  entrySelector: number
  rangeShift: number
  tables: TableRecord[]
}

export interface TableRecord {
  /** Table identifier. */
  tag: string
  /** Checksum for this table. */
  checksum: number
  /** Offset from beginning of font file. */
  offset: number
  /** Length of this table. */
  length: number
}

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface ColorVisitor {
  paintSolid(paletteIndex: number, alpha: number): void
  paintLinearGradient(
    p0: Vector,
    p1: Vector,
    p2: Vector,
    extend: Extend,
    stops: { stopOffset: number; paletteIndex: number; alpha: number }[],
  ): void
  paintGlyph(glyphId: number): void
  enterTransform(matrix: Matrix): void
  exitTransform(): void
}
