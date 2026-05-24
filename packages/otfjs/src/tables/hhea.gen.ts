// This file is auto-generated from src/tables/schema/hhea.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

export interface HheaTable {
  /** Typically set to 0x00010000 */
  version: number
  /** Typographic ascent (ascender) */
  ascent: number
  /** Typographic descent (descender) */
  descent: number
  /** Typographic line gap */
  lineGap: number
  /** Maximum advance width value in `hmtx` table */
  advanceWidthMax: number
  /** Minimum left sidebearing for glyphs with contours */
  minLeftSideBearing: number
  /** Minimum right sidebearing; min(aw - (lsb + xMax - xMin)) */
  minRightSideBearing: number
  /** max(lsb + (xMax - xMin)) */
  xMaxExtent: number
  /** Slope of cursor (rise/run); 1 for vertical */
  caretSlopeRise: number
  /** 0 for vertical */
  caretSlopeRun: number
  /** Shift for slanted highlight; 0 for non-slanted fonts */
  caretOffset: number
  /** 0 for current format */
  metricDataFormat: number
  /** Number of hMetric entries in `hmtx` table */
  numberOfHMetrics: number
}

export function readHheaTable(r: Reader): HheaTable {
  const version = r.u32()
  const ascent = r.i16()
  const descent = r.i16()
  const lineGap = r.i16()
  const advanceWidthMax = r.u16()
  const minLeftSideBearing = r.i16()
  const minRightSideBearing = r.i16()
  const xMaxExtent = r.i16()
  const caretSlopeRise = r.i16()
  const caretSlopeRun = r.i16()
  const caretOffset = r.i16()
  r.skip(8)
  const metricDataFormat = r.i16()
  const numberOfHMetrics = r.u16()

  return {
    version,
    ascent,
    descent,
    lineGap,
    advanceWidthMax,
    minLeftSideBearing,
    minRightSideBearing,
    xMaxExtent,
    caretSlopeRise,
    caretSlopeRun,
    caretOffset,
    metricDataFormat,
    numberOfHMetrics,
  }
}

export function writeHheaTable(d: HheaTable): Uint8Array {
  const w = new Writer(36)

  w.u32(d.version)
  w.i16(d.ascent)
  w.i16(d.descent)
  w.i16(d.lineGap)
  w.u16(d.advanceWidthMax)
  w.i16(d.minLeftSideBearing)
  w.i16(d.minRightSideBearing)
  w.i16(d.xMaxExtent)
  w.i16(d.caretSlopeRise)
  w.i16(d.caretSlopeRun)
  w.i16(d.caretOffset)
  w.skip(8)
  w.i16(d.metricDataFormat)
  w.u16(d.numberOfHMetrics)

  return w.toBuffer()
}
