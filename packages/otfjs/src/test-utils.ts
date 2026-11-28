// Helpers shared by tests. Not exported from the package.

import { expect } from 'vitest'

import { HeadFlags, MacStyle } from './tables/head.gen.js'
import { HeadTableWriter } from './tables/head.js'
import { HheaTableWriter } from './tables/hhea.js'
import { HmtxTableWriter } from './tables/hmtx.js'
import { MaxpTableWriter } from './tables/maxp.js'

/** Expect `point` to be within `digits` decimal places of (x, y). */
export function expectPointCloseTo(
  point: { x: number; y: number },
  x: number,
  y: number,
  digits = 3,
) {
  expect(point.x).toBeCloseTo(x, digits)
  expect(point.y).toBeCloseTo(y, digits)
}

// Minimal tables for test fonts, with everything but what's given zeroed.

export function headTable(indexToLocFormat: number) {
  return HeadTableWriter.write({
    fontRevision: 0,
    checksumAdjustment: 0,
    flags: new HeadFlags(),
    unitsPerEm: 1000,
    created: new Date(0),
    modified: new Date(0),
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    macStyle: new MacStyle(),
    lowestRecPpem: 0,
    indexToLocFormat,
  })
}

export function hheaTable(numberOfHMetrics: number) {
  return HheaTableWriter.write({
    version: 0x00010000,
    ascent: 0,
    descent: 0,
    lineGap: 0,
    advanceWidthMax: 0,
    minLeftSideBearing: 0,
    minRightSideBearing: 0,
    xMaxExtent: 0,
    caretSlopeRise: 0,
    caretSlopeRun: 0,
    caretOffset: 0,
    metricDataFormat: 0,
    numberOfHMetrics,
  })
}

export function maxpTable(numGlyphs: number) {
  return MaxpTableWriter.write({ version: 0x00005000, numGlyphs })
}

/** An hmtx table giving every glyph the same advance width. */
export function hmtxTable(numGlyphs: number, advanceWidth: number) {
  return HmtxTableWriter.write({
    longHorMetrics: [{ advanceWidth, leftSideBearing: 0 }],
    leftSideBearings: new Array<number>(numGlyphs - 1).fill(0),
  })
}
