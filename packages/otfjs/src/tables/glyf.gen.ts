// This file is auto-generated from src/tables/schema/glyf.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export interface GlyphCompositeFlags {
  arg1And2AreWords: boolean
  argsAreXYValues: boolean
  roundXYToGrid: boolean
  weHaveAScale: boolean
  moreComponents: boolean
  weHaveAnXAndYScale: boolean
  weHaveATwoByTwo: boolean
  weHaveInstructions: boolean
  useMyMetrics: boolean
  overlapCompound: boolean
  scaledComponentOffset: boolean
  unscaledComponentOffset: boolean
}

export function decodeGlyphCompositeFlags(v: number): GlyphCompositeFlags {
  return {
    arg1And2AreWords: !!(v & (1 << 0)),
    argsAreXYValues: !!(v & (1 << 1)),
    roundXYToGrid: !!(v & (1 << 2)),
    weHaveAScale: !!(v & (1 << 3)),
    moreComponents: !!(v & (1 << 5)),
    weHaveAnXAndYScale: !!(v & (1 << 6)),
    weHaveATwoByTwo: !!(v & (1 << 7)),
    weHaveInstructions: !!(v & (1 << 8)),
    useMyMetrics: !!(v & (1 << 9)),
    overlapCompound: !!(v & (1 << 10)),
    scaledComponentOffset: !!(v & (1 << 11)),
    unscaledComponentOffset: !!(v & (1 << 12)),
  }
}

export function readGlyphCompositeFlags(r: Reader): GlyphCompositeFlags {
  return decodeGlyphCompositeFlags(r.u16())
}

export function writeGlyphCompositeFlags(d: GlyphCompositeFlags): number {
  return (
    (d.arg1And2AreWords ? 1 << 0 : 0) |
    (d.argsAreXYValues ? 1 << 1 : 0) |
    (d.roundXYToGrid ? 1 << 2 : 0) |
    (d.weHaveAScale ? 1 << 3 : 0) |
    (d.moreComponents ? 1 << 5 : 0) |
    (d.weHaveAnXAndYScale ? 1 << 6 : 0) |
    (d.weHaveATwoByTwo ? 1 << 7 : 0) |
    (d.weHaveInstructions ? 1 << 8 : 0) |
    (d.useMyMetrics ? 1 << 9 : 0) |
    (d.overlapCompound ? 1 << 10 : 0) |
    (d.scaledComponentOffset ? 1 << 11 : 0) |
    (d.unscaledComponentOffset ? 1 << 12 : 0)
  )
}

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
