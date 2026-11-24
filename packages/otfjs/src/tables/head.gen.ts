// This file is auto-generated from src/tables/schema/head.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export class HeadFlags {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get baselineAtY0(): boolean {
    return (this.value & 0x1) !== 0
  }

  set baselineAtY0(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get leftSidebearingAtX0(): boolean {
    return (this.value & 0x2) !== 0
  }

  set leftSidebearingAtX0(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get instructionsMayDependOnPointSize(): boolean {
    return (this.value & 0x4) !== 0
  }

  set instructionsMayDependOnPointSize(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get forcePpemToIntegers(): boolean {
    return (this.value & 0x8) !== 0
  }

  set forcePpemToIntegers(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get instructionsMayAlterAdvanceWidth(): boolean {
    return (this.value & 0x10) !== 0
  }

  set instructionsMayAlterAdvanceWidth(on: boolean) {
    this.value = on ? this.value | 0x10 : this.value & ~0x10
  }

  get lossless(): boolean {
    return (this.value & 0x800) !== 0
  }

  set lossless(on: boolean) {
    this.value = on ? this.value | 0x800 : this.value & ~0x800
  }

  get converted(): boolean {
    return (this.value & 0x1000) !== 0
  }

  set converted(on: boolean) {
    this.value = on ? this.value | 0x1000 : this.value & ~0x1000
  }

  get clearTypeOptimized(): boolean {
    return (this.value & 0x2000) !== 0
  }

  set clearTypeOptimized(on: boolean) {
    this.value = on ? this.value | 0x2000 : this.value & ~0x2000
  }

  get lastResortFont(): boolean {
    return (this.value & 0x4000) !== 0
  }

  set lastResortFont(on: boolean) {
    this.value = on ? this.value | 0x4000 : this.value & ~0x4000
  }

  toJSON() {
    return {
      value: this.value,
      baselineAtY0: this.baselineAtY0,
      leftSidebearingAtX0: this.leftSidebearingAtX0,
      instructionsMayDependOnPointSize: this.instructionsMayDependOnPointSize,
      forcePpemToIntegers: this.forcePpemToIntegers,
      instructionsMayAlterAdvanceWidth: this.instructionsMayAlterAdvanceWidth,
      lossless: this.lossless,
      converted: this.converted,
      clearTypeOptimized: this.clearTypeOptimized,
      lastResortFont: this.lastResortFont,
    }
  }
}

export function readHeadFlags(r: Reader): HeadFlags {
  return new HeadFlags(r.u16())
}

export class MacStyle {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get bold(): boolean {
    return (this.value & 0x1) !== 0
  }

  set bold(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get italic(): boolean {
    return (this.value & 0x2) !== 0
  }

  set italic(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get underline(): boolean {
    return (this.value & 0x4) !== 0
  }

  set underline(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get outline(): boolean {
    return (this.value & 0x8) !== 0
  }

  set outline(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get shadow(): boolean {
    return (this.value & 0x10) !== 0
  }

  set shadow(on: boolean) {
    this.value = on ? this.value | 0x10 : this.value & ~0x10
  }

  get condensed(): boolean {
    return (this.value & 0x20) !== 0
  }

  set condensed(on: boolean) {
    this.value = on ? this.value | 0x20 : this.value & ~0x20
  }

  get extended(): boolean {
    return (this.value & 0x40) !== 0
  }

  set extended(on: boolean) {
    this.value = on ? this.value | 0x40 : this.value & ~0x40
  }

  toJSON() {
    return {
      value: this.value,
      bold: this.bold,
      italic: this.italic,
      underline: this.underline,
      outline: this.outline,
      shadow: this.shadow,
      condensed: this.condensed,
      extended: this.extended,
    }
  }
}

export function readMacStyle(r: Reader): MacStyle {
  return new MacStyle(r.u16())
}

export interface HeadTable {
  /** Should be 0; minor versions are backward compatible, so accept any */
  minorVersion: number
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
  /** Deprecated; should be 2, but older fonts use 0, 1, -1 or -2 */
  fontDirectionHint: number
  /** 0 for short offsets (Offset16), 1 for long (Offset32) */
  indexToLocFormat: number
}

export function readHeadTable(r: Reader): HeadTable {
  if (r.u16() !== 1) throw new Error('majorVersion: expected 1')
  const minorVersion = r.u16()
  const fontRevision = r.u32()
  const checksumAdjustment = r.u32()
  if (r.u32() !== 0x5f0f3cf5) {
    throw new Error('magicNumber: expected 0x5F0F3CF5')
  }
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
  const fontDirectionHint = r.i16()
  const indexToLocFormat = r.i16()
  if (r.i16() !== 0) throw new Error('glyphDataFormat: expected 0')

  return {
    minorVersion,
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
    fontDirectionHint,
    indexToLocFormat,
  }
}

export function writeHeadTable(d: HeadTable): Uint8Array {
  const w = new Writer(54)

  w.u16(1)
  w.u16(d.minorVersion)
  w.u32(d.fontRevision)
  w.u32(d.checksumAdjustment)
  w.u32(0x5f0f3cf5)
  w.u16(d.flags.value)
  w.u16(d.unitsPerEm)
  w.date(d.created)
  w.date(d.modified)
  w.i16(d.xMin)
  w.i16(d.yMin)
  w.i16(d.xMax)
  w.i16(d.yMax)
  w.u16(d.macStyle.value)
  w.u16(d.lowestRecPpem)
  w.i16(d.fontDirectionHint)
  w.i16(d.indexToLocFormat)
  w.i16(0)

  return w.toBuffer()
}
