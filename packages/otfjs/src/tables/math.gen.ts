// This file is auto-generated from src/tables/schema/math.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export interface MathTable {
  /** Offset to MathConstants table, from the beginning of MATH table */
  mathConstantsOffset: number
  /** Offset to MathGlyphInfo table, from the beginning of MATH table */
  mathGlyphInfoOffset: number
  /** Offset to MathVariants table, from the beginning of MATH table */
  mathVariantsOffset: number
}

export function readMathTable(r: Reader): MathTable {
  if (r.u16() !== 1) throw new Error('majorVersion: expected 1')
  if (r.u16() !== 0) throw new Error('minorVersion: expected 0')
  const mathConstantsOffset = r.u16()
  const mathGlyphInfoOffset = r.u16()
  const mathVariantsOffset = r.u16()

  return {
    mathConstantsOffset,
    mathGlyphInfoOffset,
    mathVariantsOffset,
  }
}

export function writeMathTable(d: MathTable): Uint8Array {
  const w = new Writer(10)

  w.u16(1)
  w.u16(0)
  w.u16(d.mathConstantsOffset)
  w.u16(d.mathGlyphInfoOffset)
  w.u16(d.mathVariantsOffset)

  return w.toBuffer()
}
