// This file is auto-generated from src/tables/schema/gpos.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export interface LookupFlag {
  rightToLeft: boolean
  ignoreBaseGlyphs: boolean
  ignoreLigatures: boolean
  ignoreMarks: boolean
  useMarkFilteringSet: boolean
  markAttachmentTypeMask: number
}

export function decodeLookupFlag(v: number): LookupFlag {
  return {
    rightToLeft: !!(v & (1 << 0)),
    ignoreBaseGlyphs: !!(v & (1 << 1)),
    ignoreLigatures: !!(v & (1 << 2)),
    ignoreMarks: !!(v & (1 << 3)),
    useMarkFilteringSet: !!(v & (1 << 4)),
    markAttachmentTypeMask: (v >> 8) & 0xff,
  }
}

export function readLookupFlag(r: Reader): LookupFlag {
  return decodeLookupFlag(r.u16())
}

export function writeLookupFlag(d: LookupFlag): number {
  return (
    (d.rightToLeft ? 1 << 0 : 0) |
    (d.ignoreBaseGlyphs ? 1 << 1 : 0) |
    (d.ignoreLigatures ? 1 << 2 : 0) |
    (d.ignoreMarks ? 1 << 3 : 0) |
    (d.useMarkFilteringSet ? 1 << 4 : 0) |
    ((d.markAttachmentTypeMask & 0xff) << 8)
  )
}

export interface ValueFormat {
  xPlacement: boolean
  yPlacement: boolean
  xAdvance: boolean
  yAdvance: boolean
  xPlaDeviceOffset: boolean
  yPlaDeviceOffset: boolean
  xAdvDeviceOffset: boolean
  yAdvDeviceOffset: boolean
}

export function decodeValueFormat(v: number): ValueFormat {
  return {
    xPlacement: !!(v & (1 << 0)),
    yPlacement: !!(v & (1 << 1)),
    xAdvance: !!(v & (1 << 2)),
    yAdvance: !!(v & (1 << 3)),
    xPlaDeviceOffset: !!(v & (1 << 4)),
    yPlaDeviceOffset: !!(v & (1 << 5)),
    xAdvDeviceOffset: !!(v & (1 << 6)),
    yAdvDeviceOffset: !!(v & (1 << 7)),
  }
}

export function readValueFormat(r: Reader): ValueFormat {
  return decodeValueFormat(r.u16())
}

export function writeValueFormat(d: ValueFormat): number {
  return (
    (d.xPlacement ? 1 << 0 : 0) |
    (d.yPlacement ? 1 << 1 : 0) |
    (d.xAdvance ? 1 << 2 : 0) |
    (d.yAdvance ? 1 << 3 : 0) |
    (d.xPlaDeviceOffset ? 1 << 4 : 0) |
    (d.yPlaDeviceOffset ? 1 << 5 : 0) |
    (d.xAdvDeviceOffset ? 1 << 6 : 0) |
    (d.yAdvDeviceOffset ? 1 << 7 : 0)
  )
}
