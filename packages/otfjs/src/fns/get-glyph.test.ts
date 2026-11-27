import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import { emptyGlyf } from '../glyf/glyf.utils.js'
import { GlyfCompositeFlags } from '../tables/glyf.gen.js'
import { HmtxTableWriter } from '../tables/hmtx.js'
import type { Glyf, GlyfComponent, GlyfSimple } from '../types.js'
import { compileGlyfLoca } from './compile-glyf-loca.js'
import { getGlyph } from './get-glyph.js'

const ARGS_ARE_XY_VALUES = 0x2
const WE_HAVE_A_SCALE = 0x8
const MORE_COMPONENTS = 0x20
const WE_HAVE_INSTRUCTIONS = 0x100

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
        component(ARGS_ARE_XY_VALUES | MORE_COMPONENTS, 1, 0, 0),
        component(ARGS_ARE_XY_VALUES | WE_HAVE_INSTRUCTIONS, 2, 0, 0),
      ],
      [1, 2, 3],
    )
    const glyph = getGlyph(fontWith([square, dot, composite]), 3)
    expect(glyph.instructions).toEqual(new Uint8Array([1, 2, 3]))
  })

  it('offsets components by their x and y args', () => {
    const composite = compositeGlyf([
      component(ARGS_ARE_XY_VALUES | MORE_COMPONENTS, 1, 0, 0),
      component(ARGS_ARE_XY_VALUES, 2, 50, -20),
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
      component(ARGS_ARE_XY_VALUES | MORE_COMPONENTS, 1, 0, 0),
      component(0, 2, 2, 0),
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
      component(ARGS_ARE_XY_VALUES | MORE_COMPONENTS, 1, 0, 0),
      component(WE_HAVE_A_SCALE, 2, 0, 2, [1.5]),
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
    const composite = compositeGlyf([component(0, 1, 0, 0)])
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
  flags: number,
  glyphIndex: number,
  arg1: number,
  arg2: number,
  extra: number[] = [],
): GlyfComponent {
  return {
    flags: new GlyfCompositeFlags(flags),
    glyphIndex,
    arg1,
    arg2,
    extra,
  }
}

function xys(points: { x: number; y: number }[]) {
  return points.map((p) => [p.x, p.y])
}

function bytes(size: number, fill: (view: DataView) => void) {
  const data = new Uint8Array(size)
  fill(new DataView(data.buffer))
  return data
}

function maxp(numGlyphs: number) {
  return bytes(6, (v) => {
    v.setUint32(0, 0x00005000)
    v.setUint16(4, numGlyphs)
  })
}

function hhea(numberOfHMetrics: number) {
  return bytes(36, (v) => {
    v.setUint32(0, 0x00010000)
    v.setUint16(34, numberOfHMetrics)
  })
}

function head(indexToLocFormat: number) {
  return bytes(54, (v) => {
    v.setUint16(0, 1)
    v.setUint32(12, 0x5f0f3cf5)
    v.setUint16(18, 1000)
    v.setInt16(48, 2)
    v.setInt16(50, indexToLocFormat)
  })
}
