import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import { emptyGlyf } from '../glyf/glyf.utils.js'
import { GlyfCompositeFlags } from '../tables/glyf.gen.js'
import { HeadFlags, MacStyle } from '../tables/head.gen.js'
import { HeadTableWriter } from '../tables/head.js'
import { HheaTableWriter } from '../tables/hhea.js'
import { HmtxTableWriter } from '../tables/hmtx.js'
import { MaxpTableWriter } from '../tables/maxp.js'
import type { Glyf, GlyfComponent, GlyfSimple } from '../types.js'
import { compileGlyfLoca } from './compile-glyf-loca.js'
import { getGlyph } from './get-glyph.js'

const square = simpleGlyf([
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
])

const dot = simpleGlyf([
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
])

describe('getGlyph', () => {
  it('returns simple glyphs with their id and advance', () => {
    const glyph = getGlyph(fontWith([square]), 1)
    expect(glyph).toMatchObject({ id: 1, advanceWidth: 500, type: 'simple' })
    expect(glyph.points).toEqual(square.points)
  })

  it('keeps a composite glyph’s own instructions', () => {
    const composite = compositeGlyf(
      [
        component({ argsAreXYValues: true, moreComponents: true }, 1, 0, 0),
        component({ argsAreXYValues: true, weHaveInstructions: true }, 2, 0, 0),
      ],
      [1, 2, 3],
    )
    const glyph = getGlyph(fontWith([square, dot, composite]), 3)
    expect(glyph.instructions).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('offsets components by their x and y args', () => {
    const composite = compositeGlyf([
      component({ argsAreXYValues: true, moreComponents: true }, 1, 0, 0),
      component({ argsAreXYValues: true }, 2, 50, -20),
    ])
    const glyph = getGlyph(fontWith([square, dot, composite]), 3)
    expect(glyph.endPtsOfContours).toEqual([3, 7])
    expect(xys(glyph.points.slice(4))).toEqual([
      [50, -20],
      [60, -20],
      [60, -10],
      [50, -10],
    ])
  })

  it('moves point-matched components onto the matched point', () => {
    // the dot's point 0 goes on the square's point 2, its top right corner
    const composite = compositeGlyf([
      component({ argsAreXYValues: true, moreComponents: true }, 1, 0, 0),
      component({}, 2, 2, 0),
    ])
    const glyph = getGlyph(fontWith([square, dot, composite]), 3)
    expect(xys(glyph.points.slice(4))).toEqual([
      [100, 100],
      [110, 100],
      [110, 110],
      [100, 110],
    ])
  })

  it('matches points after scaling the component', () => {
    // scaled 1.5x, the dot's point 2 is (15, 15), and goes on the origin
    const composite = compositeGlyf([
      component({ argsAreXYValues: true, moreComponents: true }, 1, 0, 0),
      component({ weHaveAScale: true }, 2, 0, 2, [1.5]),
    ])
    const glyph = getGlyph(fontWith([square, dot, composite]), 3)
    expect(xys(glyph.points.slice(4))).toEqual([
      [-15, -15],
      [0, -15],
      [0, 0],
      [-15, 0],
    ])
  })

  it('throws when a matched point doesn’t exist', () => {
    const composite = compositeGlyf([component({}, 1, 0, 0)])
    expect(() => getGlyph(fontWith([square, composite]), 2)).toThrow(
      "matches point 0 to component point 0, which doesn't exist",
    )
  })
})

/** A font whose glyph 0 is empty, followed by `glyphs`, all 500 wide. */
function fontWith(glyphs: Glyf[]) {
  const all = [emptyGlyf(), ...glyphs]
  const { glyf, loca, indexToLocFormat } = compileGlyfLoca(all)
  const hmtx = HmtxTableWriter.write({
    longHorMetrics: [{ advanceWidth: 500, leftSideBearing: 0 }],
    leftSideBearings: all.slice(1).map(() => 0),
  })

  return new FontHandle(
    buildFont({
      tables: {
        glyf,
        loca,
        hmtx,
        head: head(indexToLocFormat),
        hhea: hhea(1),
        maxp: maxp(all.length),
      },
    }),
  )
}

function simpleGlyf(points: [number, number][]): GlyfSimple {
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  return {
    ...emptyGlyf(),
    xMin: Math.min(...xs),
    yMin: Math.min(...ys),
    xMax: Math.max(...xs),
    yMax: Math.max(...ys),
    endPtsOfContours: [points.length - 1],
    points: points.map(([x, y]) => ({ x, y, onCurve: true })),
  }
}

function compositeGlyf(
  components: GlyfComponent[],
  instructions: number[] = [],
): Glyf {
  return {
    type: 'composite',
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    components,
    instructions: new Uint8Array(instructions),
  }
}

function component(
  flags: Partial<GlyfCompositeFlags>,
  glyphIndex: number,
  arg1: number,
  arg2: number,
  extra: number[] = [],
): GlyfComponent {
  return {
    flags: Object.assign(new GlyfCompositeFlags(), flags),
    glyphIndex,
    arg1,
    arg2,
    extra,
  }
}

function xys(points: { x: number; y: number }[]) {
  return points.map((p) => [p.x, p.y])
}

function head(indexToLocFormat: number) {
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

function hhea(numberOfHMetrics: number) {
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

function maxp(numGlyphs: number) {
  return MaxpTableWriter.write({ version: 0x00005000, numGlyphs })
}
