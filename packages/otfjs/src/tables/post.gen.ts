// This file is auto-generated from src/tables/schema/post.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export interface PostTable01 {
  version: 0x00010000
  /** Italic angle in counter-clockwise degrees from the vertical (fixed-point 16.16) */
  italicAngle: number
  /** Suggested distance of the top of the underline from the baseline (negative: below baseline) */
  underlinePosition: number
  /** Suggested values for the underline thickness */
  underlineThickness: number
  /** Set to 0 if the font is proportionally spaced, non-zero if monospaced */
  isFixedPitch: number
  /** Minimum memory usage when an OpenType font is downloaded */
  minMemType42: number
  /** Maximum memory usage when an OpenType font is downloaded */
  maxMemType42: number
  /** Minimum memory usage when an OpenType font is downloaded as a Type 1 font */
  minMemType1: number
  /** Maximum memory usage when an OpenType font is downloaded as a Type 1 font */
  maxMemType1: number
}

export interface PostTable02 {
  version: 0x00020000
  /** Italic angle in counter-clockwise degrees from the vertical (fixed-point 16.16) */
  italicAngle: number
  /** Suggested distance of the top of the underline from the baseline (negative: below baseline) */
  underlinePosition: number
  /** Suggested values for the underline thickness */
  underlineThickness: number
  /** Set to 0 if the font is proportionally spaced, non-zero if monospaced */
  isFixedPitch: number
  /** Minimum memory usage when an OpenType font is downloaded */
  minMemType42: number
  /** Maximum memory usage when an OpenType font is downloaded */
  maxMemType42: number
  /** Minimum memory usage when an OpenType font is downloaded as a Type 1 font */
  minMemType1: number
  /** Maximum memory usage when an OpenType font is downloaded as a Type 1 font */
  maxMemType1: number
  glyphNameIndexes: number[]
}

export interface PostTable03 {
  version: 0x00030000
  /** Italic angle in counter-clockwise degrees from the vertical (fixed-point 16.16) */
  italicAngle: number
  /** Suggested distance of the top of the underline from the baseline (negative: below baseline) */
  underlinePosition: number
  /** Suggested values for the underline thickness */
  underlineThickness: number
  /** Set to 0 if the font is proportionally spaced, non-zero if monospaced */
  isFixedPitch: number
  /** Minimum memory usage when an OpenType font is downloaded */
  minMemType42: number
  /** Maximum memory usage when an OpenType font is downloaded */
  maxMemType42: number
  /** Minimum memory usage when an OpenType font is downloaded as a Type 1 font */
  minMemType1: number
  /** Maximum memory usage when an OpenType font is downloaded as a Type 1 font */
  maxMemType1: number
}

export type PostTable = PostTable01 | PostTable02 | PostTable03

export function readPostTable(r: Reader): PostTable {
  const version = r.u32()
  switch (version) {
    case 0x00010000: {
      const italicAngle = r.i32()
      const underlinePosition = r.i16()
      const underlineThickness = r.i16()
      const isFixedPitch = r.u32()
      const minMemType42 = r.u32()
      const maxMemType42 = r.u32()
      const minMemType1 = r.u32()
      const maxMemType1 = r.u32()
      return {
        version,
        italicAngle,
        underlinePosition,
        underlineThickness,
        isFixedPitch,
        minMemType42,
        maxMemType42,
        minMemType1,
        maxMemType1,
      }
    }
    case 0x00020000: {
      const italicAngle = r.i32()
      const underlinePosition = r.i16()
      const underlineThickness = r.i16()
      const isFixedPitch = r.u32()
      const minMemType42 = r.u32()
      const maxMemType42 = r.u32()
      const minMemType1 = r.u32()
      const maxMemType1 = r.u32()
      const numGlyphs = r.u16()
      const glyphNameIndexes = r.array(numGlyphs, (r) => r.u16())
      return {
        version,
        italicAngle,
        underlinePosition,
        underlineThickness,
        isFixedPitch,
        minMemType42,
        maxMemType42,
        minMemType1,
        maxMemType1,
        glyphNameIndexes,
      }
    }
    case 0x00030000: {
      const italicAngle = r.i32()
      const underlinePosition = r.i16()
      const underlineThickness = r.i16()
      const isFixedPitch = r.u32()
      const minMemType42 = r.u32()
      const maxMemType42 = r.u32()
      const minMemType1 = r.u32()
      const maxMemType1 = r.u32()
      return {
        version,
        italicAngle,
        underlinePosition,
        underlineThickness,
        isFixedPitch,
        minMemType42,
        maxMemType42,
        minMemType1,
        maxMemType1,
      }
    }
    default:
      throw new Error(`Unknown PostTable version: 0x${version.toString(16).toUpperCase()}`)
  }
}

export function writePostTable(d: PostTable): Uint8Array {
  switch (d.version) {
    case 0x00010000: {
      const w = new Writer(32)
      w.u32(d.version)
      w.i32(d.italicAngle)
      w.i16(d.underlinePosition)
      w.i16(d.underlineThickness)
      w.u32(d.isFixedPitch)
      w.u32(d.minMemType42)
      w.u32(d.maxMemType42)
      w.u32(d.minMemType1)
      w.u32(d.maxMemType1)
      return w.toBuffer()
    }
    case 0x00020000: {
      const w = new Writer(34 + d.glyphNameIndexes.length * 2)
      w.u32(d.version)
      w.i32(d.italicAngle)
      w.i16(d.underlinePosition)
      w.i16(d.underlineThickness)
      w.u32(d.isFixedPitch)
      w.u32(d.minMemType42)
      w.u32(d.maxMemType42)
      w.u32(d.minMemType1)
      w.u32(d.maxMemType1)
      w.u16(d.glyphNameIndexes.length)
      for (const item of d.glyphNameIndexes) {
        w.u16(item)
      }
      return w.toBuffer()
    }
    case 0x00030000: {
      const w = new Writer(32)
      w.u32(d.version)
      w.i32(d.italicAngle)
      w.i16(d.underlinePosition)
      w.i16(d.underlineThickness)
      w.u32(d.isFixedPitch)
      w.u32(d.minMemType42)
      w.u32(d.maxMemType42)
      w.u32(d.minMemType1)
      w.u32(d.maxMemType1)
      return w.toBuffer()
    }
    default:
      throw new Error(`Unknown PostTable version`)
  }
}
