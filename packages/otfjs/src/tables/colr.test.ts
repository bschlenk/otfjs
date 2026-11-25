import * as mat from '@bschlenk/mat'
import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { ColorRecordType, readColrTable } from './colr.js'

describe('COLR transform paints', () => {
  it('reads PaintScaleUniform (20)', () => {
    const m = transformOf(20, [f2dot14(0.5)])
    expectPoint(m, [10, 20], [5, 10])
  })

  it('reads PaintScaleUniformAroundCenter (22)', () => {
    const m = transformOf(22, [f2dot14(1.5), i16(10), i16(20)])
    expectPoint(m, [10, 20], [10, 20])
    expectPoint(m, [12, 20], [13, 20])
  })

  it('reads PaintRotate (24) counter-clockwise in half turns', () => {
    const m = transformOf(24, [f2dot14(0.5)])
    expectPoint(m, [1, 0], [0, 1])
  })

  it('reads PaintRotateAroundCenter (26)', () => {
    const m = transformOf(26, [f2dot14(0.5), i16(10), i16(0)])
    expectPoint(m, [10, 0], [10, 0])
    expectPoint(m, [11, 0], [10, 1])
  })

  it('reads PaintSkew (28), tilting the y axis counter-clockwise for x', () => {
    const m = transformOf(28, [f2dot14(0.25), f2dot14(0)])
    expectPoint(m, [0, 1], [-1, 1])
    expectPoint(m, [1, 0], [1, 0])
  })

  it('reads PaintSkewAroundCenter (30)', () => {
    const m = transformOf(30, [f2dot14(0), f2dot14(0.25), i16(10), i16(0)])
    expectPoint(m, [10, 0], [10, 0])
    expectPoint(m, [11, 0], [11, 1])
  })
})

/**
 * The matrix a COLR v1 table reads for glyph 1, whose paint is a transform
 * paint in `format` with `fields` after its child offset, wrapping a
 * PaintGlyph and PaintSolid.
 */
function transformOf(format: number, fields: number[][]): mat.Matrix {
  const transform = [format, ...u24(4 + fields.flat().length), ...fields.flat()]
  const glyph = [10, ...u24(6), ...u16(2)] // PaintGlyph: glyph 2
  const solid = [2, ...u16(0), ...f2dot14(1)] // PaintSolid: palette 0
  const baseGlyphList = [...u32(1), ...u16(1), ...u32(10)]

  const header = [
    ...u16(1), // version
    ...u16(0), // numBaseGlyphRecords
    ...u32(0), // baseGlyphRecordsOffset
    ...u32(0), // layerRecordsOffset
    ...u16(0), // numLayerRecords
    ...u32(34), // baseGlyphListOffset
    ...u32(0), // layerListOffset
    ...u32(0), // clipListOffset
    ...u32(0), // varIndexMapOffset
    ...u32(0), // itemVariationStoreOffset
  ]

  const data = new Uint8Array([
    ...header,
    ...baseGlyphList,
    ...transform,
    ...glyph,
    ...solid,
  ])
  const [layer] = readColrTable(new Reader(data)).colorGlyph(1)!
  if (layer.format !== ColorRecordType.TRANSFORM) {
    throw new Error(`expected a transform layer, got format ${layer.format}`)
  }
  expect(layer.children[0].format).toBe(ColorRecordType.GLYPH)
  return layer.props.matrix
}

function expectPoint(m: mat.Matrix, [x, y]: number[], [ex, ey]: number[]) {
  const p = mat.transformPoint(m, { x, y })
  expect(p.x).toBeCloseTo(ex, 3)
  expect(p.y).toBeCloseTo(ey, 3)
}

function f2dot14(n: number) {
  return i16(Math.round(n * 16384))
}

function i16(n: number) {
  return u16(n & 0xffff)
}

function u16(n: number) {
  return [n >> 8, n & 0xff]
}

function u24(n: number) {
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function u32(n: number) {
  return [(n >>> 24) & 0xff, (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
