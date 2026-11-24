// This file is auto-generated from src/tables/schema/glyf.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export interface GlyphFlags {
  onCurvePoint: boolean
  xShortVector: boolean
  yShortVector: boolean
  repeat: boolean
  xIsSameOrPositiveXShortVector: boolean
  yIsSameOrPositiveYShortVector: boolean
  contoursOverlap: boolean
}

export function decodeGlyphFlags(v: number): GlyphFlags {
  return {
    onCurvePoint: !!(v & (1 << 0)),
    xShortVector: !!(v & (1 << 1)),
    yShortVector: !!(v & (1 << 2)),
    repeat: !!(v & (1 << 3)),
    xIsSameOrPositiveXShortVector: !!(v & (1 << 4)),
    yIsSameOrPositiveYShortVector: !!(v & (1 << 5)),
    contoursOverlap: !!(v & (1 << 6)),
  }
}

export function readGlyphFlags(r: Reader): GlyphFlags {
  return decodeGlyphFlags(r.u8())
}

export function writeGlyphFlags(d: GlyphFlags): number {
  return (
    (d.onCurvePoint ? 1 << 0 : 0) |
    (d.xShortVector ? 1 << 1 : 0) |
    (d.yShortVector ? 1 << 2 : 0) |
    (d.repeat ? 1 << 3 : 0) |
    (d.xIsSameOrPositiveXShortVector ? 1 << 4 : 0) |
    (d.yIsSameOrPositiveYShortVector ? 1 << 5 : 0) |
    (d.contoursOverlap ? 1 << 6 : 0)
  )
}
