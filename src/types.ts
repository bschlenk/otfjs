export const enum SfntVersion {
  TRUE_TYPE_OUTLINES = 0x00010000,
  CCF_DATA = 0x4f54544f,
}

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
