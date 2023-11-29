// https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html#ScalerTypeNote
export const enum SfntVersion {
  TRUE_TYPE = 0x00010000,
  OPEN_TYPE = 0x4f54544f, // "OTTO"
  APPLE_TRUE_TYPE = 0x74727565, // "true"
  POST_SCRIPT = 0x74797031, // "typ1"
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
