// This file is auto-generated from src/tables/schema/head.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export interface HeadFlags {
  baselineAtY0: boolean
  leftSidebearingAtX0: boolean
  instructionsMayDependOnPointSize: boolean
  forcePpemToIntegers: boolean
  instructionsMayAlterAdvanceWidth: boolean
  lossless: boolean
  converted: boolean
  clearTypeOptimized: boolean
  lastResortFont: boolean
}

export function readHeadFlags(r: Reader): HeadFlags {
  const v = r.u16()
  return {
    baselineAtY0: !!(v & (1 << 0)),
    leftSidebearingAtX0: !!(v & (1 << 1)),
    instructionsMayDependOnPointSize: !!(v & (1 << 2)),
    forcePpemToIntegers: !!(v & (1 << 3)),
    instructionsMayAlterAdvanceWidth: !!(v & (1 << 4)),
    lossless: !!(v & (1 << 11)),
    converted: !!(v & (1 << 12)),
    clearTypeOptimized: !!(v & (1 << 13)),
    lastResortFont: !!(v & (1 << 14)),
  }
}

export function writeHeadFlags(d: HeadFlags): number {
  return (
    (d.baselineAtY0 ? (1 << 0) : 0) |
    (d.leftSidebearingAtX0 ? (1 << 1) : 0) |
    (d.instructionsMayDependOnPointSize ? (1 << 2) : 0) |
    (d.forcePpemToIntegers ? (1 << 3) : 0) |
    (d.instructionsMayAlterAdvanceWidth ? (1 << 4) : 0) |
    (d.lossless ? (1 << 11) : 0) |
    (d.converted ? (1 << 12) : 0) |
    (d.clearTypeOptimized ? (1 << 13) : 0) |
    (d.lastResortFont ? (1 << 14) : 0)
  )
}

export interface MacStyle {
  bold: boolean
  italic: boolean
  underline: boolean
  outline: boolean
  shadow: boolean
  condensed: boolean
  extended: boolean
}

export function readMacStyle(r: Reader): MacStyle {
  const v = r.u16()
  return {
    bold: !!(v & (1 << 0)),
    italic: !!(v & (1 << 1)),
    underline: !!(v & (1 << 2)),
    outline: !!(v & (1 << 3)),
    shadow: !!(v & (1 << 4)),
    condensed: !!(v & (1 << 5)),
    extended: !!(v & (1 << 6)),
  }
}

export function writeMacStyle(d: MacStyle): number {
  return (
    (d.bold ? (1 << 0) : 0) |
    (d.italic ? (1 << 1) : 0) |
    (d.underline ? (1 << 2) : 0) |
    (d.outline ? (1 << 3) : 0) |
    (d.shadow ? (1 << 4) : 0) |
    (d.condensed ? (1 << 5) : 0) |
    (d.extended ? (1 << 6) : 0)
  )
}

export interface HeadTable {
  /** Set by font manufacturer */
  fontRevision: number
  /** To compute: set it to 0, sum the entire font as uint32, then store 0xB1B0AFBA - sum */
  checksumAdjustment: number
  flags: HeadFlags
  /** Valid range is from 16 to 16384 */
  unitsPerEm: number
  /** Seconds since 12:00 midnight, January 1st 1904, UTC */
  created: Date
  /** Seconds since 12:00 midnight, January 1st 1904, UTC */
  modified: Date
  /** Minimum x coordinate across all glyph bounding boxes */
  xMin: number
  /** Minimum y coordinate across all glyph bounding boxes */
  yMin: number
  /** Maximum x coordinate across all glyph bounding boxes */
  xMax: number
  /** Maximum y coordinate across all glyph bounding boxes */
  yMax: number
  macStyle: MacStyle
  /** Smallest readable size in pixels */
  lowestRecPpem: number
  /** 0 for short offsets (Offset16), 1 for long (Offset32) */
  indexToLocFormat: number
}

export function readHeadTable(r: Reader): HeadTable {
  if (r.u16() !== 1) throw new Error('majorVersion: expected 1')
  if (r.u16() !== 0) throw new Error('minorVersion: expected 0')
  const fontRevision = r.u32()
  const checksumAdjustment = r.u32()
  if (r.u32() !== 0x5F0F3CF5) throw new Error('magicNumber: expected 0x5F0F3CF5')
  const flags = readHeadFlags(r)
  const unitsPerEm = r.u16()
  const created = r.date()
  const modified = r.date()
  const xMin = r.i16()
  const yMin = r.i16()
  const xMax = r.i16()
  const yMax = r.i16()
  const macStyle = readMacStyle(r)
  const lowestRecPpem = r.u16()
  if (r.i16() !== 2) throw new Error('fontDirectionHint: expected 2')
  const indexToLocFormat = r.i16()
  if (r.i16() !== 0) throw new Error('glyphDataFormat: expected 0')

  return {
    fontRevision,
    checksumAdjustment,
    flags,
    unitsPerEm,
    created,
    modified,
    xMin,
    yMin,
    xMax,
    yMax,
    macStyle,
    lowestRecPpem,
    indexToLocFormat,
  }
}

export function writeHeadTable(d: HeadTable): Uint8Array {
  const w = new Writer(54)

  w.u16(1)
  w.u16(0)
  w.u32(d.fontRevision)
  w.u32(d.checksumAdjustment)
  w.u32(0x5F0F3CF5)
  w.u16(writeHeadFlags(d.flags))
  w.u16(d.unitsPerEm)
  w.date(d.created)
  w.date(d.modified)
  w.i16(d.xMin)
  w.i16(d.yMin)
  w.i16(d.xMax)
  w.i16(d.yMax)
  w.u16(writeMacStyle(d.macStyle))
  w.u16(d.lowestRecPpem)
  w.i16(2)
  w.i16(d.indexToLocFormat)
  w.i16(0)

  return w.toBuffer()
}
