export interface Header {
  sfntVersion: number
  numTables: number
  searchRange: number
  entrySelector: number
  rangeShift: number
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
