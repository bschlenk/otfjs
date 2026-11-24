import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { compileGlyfLoca } from '../fns/compile-glyf-loca.js'
import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import type { Glyph, GlyphComposite, GlyphSimple } from '../types.js'
import { decodeGlyphCompositeFlags } from './glyf.gen.js'
import {
  emptyGlyph,
  GlyfTableWriter,
  GlyfTag,
  isEmptyGlyph,
  readGlyf,
  writeGlyfTableWithOffsets,
} from './glyf.js'
import { LocaTableReader } from './loca.js'

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

describe('writeGlyfTableWithOffsets', () => {
  it('round-trips simple, composite, and empty glyphs', () => {
    const glyphs = [emptyGlyph(), simple, composite]
    expect(roundTrip(glyphs)).toEqual(glyphs)
  })

  it('writes glyphs with instructions but no contours', () => {
    const glyph = { ...emptyGlyph(), instructions: new Uint8Array([1]) }
    expect(isEmptyGlyph(glyph)).toBe(false)
    expect(roundTrip([glyph])).toEqual([glyph])
  })

  it('splits runs of more than 255 repeated flags', () => {
    // every point moves +1 in x, so all 300 flags are identical
    const points = Array.from({ length: 300 }, (_, i) => ({
      x: i + 1,
      y: 0,
      onCurve: true,
    }))
    const glyph: GlyphSimple = {
      ...emptyGlyph(),
      xMin: 1,
      xMax: 300,
      endPtsOfContours: [points.length - 1],
      points,
    }
    expect(roundTrip([glyph])).toEqual([glyph])
  })

  it('writes each glyph at a 4-byte aligned offset', () => {
    const { offsets } = writeGlyfTableWithOffsets([
      simple,
      emptyGlyph(),
      composite,
    ])
    expect(offsets).toHaveLength(4)
    for (const offset of offsets) expect(offset % 4).toBe(0)
    expect(offsets[1]).toBe(offsets[2]) // empty glyphs take no space
  })

  it('sets the overlap flag only on the first point', () => {
    const { data } = writeGlyfTableWithOffsets([simple])
    // header (10) + endPts (2 * 2) + instruction length (2) + instructions
    const flagsStart = 10 + 4 + 2 + simple.instructions.length
    const OVERLAP = 1 << 6
    expect(data[flagsStart] & OVERLAP).toBe(OVERLAP)
    expect(data[flagsStart + 1] & OVERLAP).toBe(0)
  })
})

describe('compileGlyfLoca', () => {
  const glyphs = [emptyGlyph(), simple, composite]

  it.each([0, 1] as const)(
    'round-trips through a font with loca format %i',
    (format) => {
      const { glyf, loca, indexToLocFormat } = compileGlyfLoca(glyphs, format)
      expect(indexToLocFormat).toBe(format)

      const font = new FontHandle(
        buildFont({
          tables: { glyf, loca, head: head(format), maxp: maxp(glyphs.length) },
        }),
      )

      expect(readAllGlyphs(font)).toEqual(glyphs)
    },
  )

  it('picks the short loca format when the offsets allow it', () => {
    const { loca, indexToLocFormat } = compileGlyfLoca(glyphs)
    expect(indexToLocFormat).toBe(0)
    expect(loca.length).toBe((glyphs.length + 1) * 2)
  })

  it('writes the same glyf bytes as GlyfTableWriter', () => {
    expect(compileGlyfLoca(glyphs).glyf).toEqual(GlyfTableWriter.write(glyphs))
  })

  it('reads loca offsets matching the written glyphs', () => {
    const { glyf, loca } = compileGlyfLoca(glyphs)
    const font = new FontHandle(
      buildFont({
        tables: { glyf, loca, head: head(0), maxp: maxp(glyphs.length) },
      }),
    )
    expect(font.readTable(LocaTableReader)).toEqual(
      writeGlyfTableWithOffsets(glyphs).offsets,
    )
  })
})

function roundTrip(glyphs: Glyph[]) {
  const { data, offsets } = writeGlyfTableWithOffsets(glyphs)
  return glyphs.map((_, i) =>
    readGlyf(new Reader(data.subarray(offsets[i], offsets[i + 1]))),
  )
}

function maxp(numGlyphs: number) {
  const data = new Uint8Array(6)
  const view = new DataView(data.buffer)
  view.setUint32(0, 0x00005000)
  view.setUint16(4, numGlyphs)
  return data
}

function head(indexToLocFormat: number) {
  const data = new Uint8Array(54)
  const view = new DataView(data.buffer)
  view.setUint16(0, 1)
  view.setUint32(12, 0x5f0f3cf5)
  view.setInt16(48, 2)
  view.setInt16(50, indexToLocFormat)
  return data
}

function component(flags: number, glyphIndex: number, extra: number[] = []) {
  return {
    flags: decodeGlyphCompositeFlags(flags),
    glyphIndex,
    arg1: flags & 1 ? -1000 : -5,
    arg2: flags & 1 ? 2000 : 7,
    extra,
  }
}

function readAllGlyphs(font: FontHandle) {
  const offsets = font.readTable(LocaTableReader)
  const glyf = font.getTableView(GlyfTag)
  return offsets
    .slice(0, -1)
    .map((offset, i) =>
      readGlyf(glyf.subtable(offset, offsets[i + 1] - offset)),
    )
}
