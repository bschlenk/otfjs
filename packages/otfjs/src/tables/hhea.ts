// https://learn.microsoft.com/en-us/typography/opentype/spec/hhea

import { Reader } from './buffer.js'

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
  /**
   * Minimum left sidebearing value in `hmtx` table for glyphs
   * with contours (empty glyphs should be ignored)
   */
  minLeftSideBearing: number
  /**
   * Minimum right sidebearing value; calculated as
   * min(aw - (lsb + xMax - xMin)) for glyphs with contours
   * (empty glyphs should be ignored)
   */
  minRightSideBearing: number
  /** Max(lsb + (xMax - xMin)) */
  xMaxExtent: number
  /** Used to calculate the slope of the cursor (rise/run); 1 for vertical */
  caretSlopeRise: number
  /** See `caretSlopeRise`. 0 for vertical. */
  caretSlopeRun: number
  /**
   * The amount by which a slanted highlight on a glyph needs to be shifted to
   * produce the best appearance. Set to 0 for non-slanted fonts
   */
  caretOffset: number
  /** 0 for current format */
  metricDataFormat: number
  /** Number of hMetric entries in `htmx` table */
  numberOfHMetrics: number
}

export function readHheaTable(view: Reader) {
  const version = view.u32()
  const ascent = view.i16()
  const descent = view.i16()
  const lineGap = view.i16()
  const advanceWidthMax = view.u16()
  const minLeftSideBearing = view.i16()
  const minRightSideBearing = view.i16()
  const xMaxExtent = view.i16()
  const caretSlopeRise = view.i16()
  const caretSlopeRun = view.i16()
  const caretOffset = view.i16()

  // skip reserved bytes
  view.skip(8)

  const metricDataFormat = view.i16()
  const numberOfHMetrics = view.u16()

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
