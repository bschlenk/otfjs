// This file is auto-generated from src/tables/schema/maxp.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export interface MaxpTable05 {
  version: 0x00005000
  /** Number of glyphs in the font */
  numGlyphs: number
}

export interface MaxpTable10 {
  version: 0x00010000
  /** Number of glyphs in the font */
  numGlyphs: number
  /** Maximum points in a non-composite glyph */
  maxPoints: number
  /** Maximum contours in a non-composite glyph */
  maxContours: number
  /** Maximum points in a composite glyph */
  maxCompositePoints: number
  /** Maximum contours in a composite glyph */
  maxCompositeContours: number
  /** 1 if instructions do not use the twilight zone, 2 if they do */
  maxZones: number
  /** Maximum points used in Z0 */
  maxTwilightPoints: number
  /** Number of Storage Area locations */
  maxStorage: number
  /** Number of FDEFs, equal to the highest function number + 1 */
  maxFunctionDefs: number
  /** Number of IDEFs */
  maxInstructionDefs: number
  /** Maximum stack depth across all programs */
  maxStackElements: number
  /** Maximum byte count for glyph instructions */
  maxSizeOfInstructions: number
  /** Maximum number of components referenced at top level */
  maxComponentElements: number
  /** Maximum levels of recursion; 1 for simple components */
  maxComponentDepth: number
}

export type MaxpTable = MaxpTable05 | MaxpTable10

export function readMaxpTable(r: Reader): MaxpTable {
  const version = r.u32()
  switch (version) {
    case 0x00005000: {
      const numGlyphs = r.u16()
      return {
        version,
        numGlyphs,
      }
    }
    case 0x00010000: {
      const numGlyphs = r.u16()
      const maxPoints = r.u16()
      const maxContours = r.u16()
      const maxCompositePoints = r.u16()
      const maxCompositeContours = r.u16()
      const maxZones = r.u16()
      const maxTwilightPoints = r.u16()
      const maxStorage = r.u16()
      const maxFunctionDefs = r.u16()
      const maxInstructionDefs = r.u16()
      const maxStackElements = r.u16()
      const maxSizeOfInstructions = r.u16()
      const maxComponentElements = r.u16()
      const maxComponentDepth = r.u16()
      return {
        version,
        numGlyphs,
        maxPoints,
        maxContours,
        maxCompositePoints,
        maxCompositeContours,
        maxZones,
        maxTwilightPoints,
        maxStorage,
        maxFunctionDefs,
        maxInstructionDefs,
        maxStackElements,
        maxSizeOfInstructions,
        maxComponentElements,
        maxComponentDepth,
      }
    }
    default:
      throw new Error(`Unknown MaxpTable version: 0x${version.toString(16).toUpperCase()}`)
  }
}

export function writeMaxpTable(d: MaxpTable): Uint8Array {
  switch (d.version) {
    case 0x00005000: {
      const w = new Writer(6)
      w.u32(d.version)
      w.u16(d.numGlyphs)
      return w.toBuffer()
    }
    case 0x00010000: {
      const w = new Writer(32)
      w.u32(d.version)
      w.u16(d.numGlyphs)
      w.u16(d.maxPoints)
      w.u16(d.maxContours)
      w.u16(d.maxCompositePoints)
      w.u16(d.maxCompositeContours)
      w.u16(d.maxZones)
      w.u16(d.maxTwilightPoints)
      w.u16(d.maxStorage)
      w.u16(d.maxFunctionDefs)
      w.u16(d.maxInstructionDefs)
      w.u16(d.maxStackElements)
      w.u16(d.maxSizeOfInstructions)
      w.u16(d.maxComponentElements)
      w.u16(d.maxComponentDepth)
      return w.toBuffer()
    }
    default:
      throw new Error(`Unknown MaxpTable version`)
  }
}
