import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { glyphCompositeFlags } from '../glyph-utils.js'
import { emptyGlyph, isEmptyGlyph, readGlyf } from '../tables/glyf.js'
import type { Glyph, GlyphComposite, GlyphSimple } from '../types.js'
import { writeGlyfTable } from './glyf.js'

const simple: GlyphSimple = {
  type: 'simple',
  xMin: -300,
  yMin: 0,
  xMax: 700,
  yMax: 800,
  endPtsOfContours: [3, 6],
  instructions: new Uint8Array([0xb0, 0x01]),
  contoursOverlap: true,
  points: [
    // short, long, negative, and repeated-zero deltas
    { x: 0, y: 0, onCurve: true },
    { x: 10, y: 0, onCurve: true },
    { x: 10, y: 800, onCurve: false },
    { x: -300, y: 800, onCurve: true },
    { x: -300, y: 795, onCurve: true },
    { x: 700, y: 795, onCurve: true },
    { x: 700, y: 795, onCurve: true },
  ],
}

const composite: GlyphComposite = {
  type: 'composite',
  xMin: 0,
  yMin: -10,
  xMax: 500,
  yMax: 900,
  components: [
    // args are words, args are xy values, we have a scale, more components
    component(0b0000_0000_0010_1011, 1, [0.5]),
    // args are bytes, args are xy values, 2x2, we have instructions
    component(0b0000_0001_1000_0010, 2, [1, 0, 0.25, -1]),
  ],
  instructions: new Uint8Array([1, 2, 3]),
}

describe('writeGlyfTable', () => {
  it('round-trips simple, composite, and empty glyphs', () => {
    const glyphs = [emptyGlyph(), simple, composite]
    expect(roundTrip(glyphs)).toEqual(glyphs)
  })

  it('writes glyphs with instructions but no contours', () => {
    const glyph = { ...emptyGlyph(), instructions: new Uint8Array([1]) }
    expect(isEmptyGlyph(glyph)).toBe(false)
    expect(roundTrip([glyph])).toEqual([glyph])
  })

  it('writes each glyph at a 4-byte aligned offset', () => {
    const loca: number[] = []
    writeGlyfTable([simple, emptyGlyph(), composite], loca)
    expect(loca).toHaveLength(4)
    for (const offset of loca) expect(offset % 4).toBe(0)
    expect(loca[1]).toBe(loca[2]) // empty glyphs take no space
  })

  it('sets the overlap flag only on the first point', () => {
    const loca: number[] = []
    const data = writeGlyfTable([simple], loca)
    // header (10) + endPts (2 * 2) + instruction length (2) + instructions
    const flagsStart = 10 + 4 + 2 + simple.instructions.length
    const OVERLAP = 1 << 6
    expect(data[flagsStart] & OVERLAP).toBe(OVERLAP)
    expect(data[flagsStart + 1] & OVERLAP).toBe(0)
  })
})

function roundTrip(glyphs: Glyph[]) {
  const loca: number[] = []
  const data = writeGlyfTable(glyphs, loca)
  return glyphs.map((_, i) =>
    readGlyf(new Reader(data.subarray(loca[i], loca[i + 1]))),
  )
}

function component(flags: number, glyphIndex: number, extra: number[] = []) {
  return {
    flags: glyphCompositeFlags(flags),
    glyphIndex,
    arg1: flags & 1 ? -1000 : -5,
    arg2: flags & 1 ? 2000 : 7,
    extra,
  }
}
