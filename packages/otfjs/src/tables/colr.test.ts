import * as mat from '@bschlenk/mat'
import { Reader, Writer } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { expectPointCloseTo } from '../test-utils.js'
import { ColorRecordType, readColrTable } from './colr.js'

describe('COLR transform paints', () => {
  it('reads PaintTransform (12) in Affine2x3 field order', () => {
    // xx, yx, xy, yy, dx, dy: a shear where x' = x + y.
    const m = transformOf(12, (w) => {
      w.u24(7) // the Affine2x3 follows this paint's 7 bytes
      for (const n of [1, 0, 1, 1, 0, 0]) w.i32(n * 0x10000)
    })
    expectPoint(m, [0, 1], [1, 1])
  })

  it('reads PaintTranslate (14)', () => {
    const m = transformOf(14, (w) => {
      w.i16(5)
      w.i16(-3)
    })
    expectPoint(m, [1, 1], [6, -2])
  })

  it('reads PaintScale (16)', () => {
    const m = transformOf(16, (w) => {
      w.f2dot14(0.5)
      w.f2dot14(1.5)
    })
    expectPoint(m, [10, 10], [5, 15])
  })

  it('reads PaintScaleAroundCenter (18)', () => {
    const m = transformOf(18, (w) => {
      w.f2dot14(0.5)
      w.f2dot14(1.5)
      w.i16(10)
      w.i16(20)
    })
    expectPoint(m, [10, 20], [10, 20])
    expectPoint(m, [12, 22], [11, 23])
  })

  it('reads PaintScaleUniform (20)', () => {
    const m = transformOf(20, (w) => w.f2dot14(0.5))
    expectPoint(m, [10, 20], [5, 10])
  })

  it('reads PaintScaleUniformAroundCenter (22)', () => {
    const m = transformOf(22, (w) => {
      w.f2dot14(1.5)
      w.i16(10)
      w.i16(20)
    })
    expectPoint(m, [10, 20], [10, 20])
    expectPoint(m, [12, 20], [13, 20])
  })

  it('reads PaintRotate (24) counter-clockwise in half turns', () => {
    const m = transformOf(24, (w) => w.f2dot14(0.5))
    expectPoint(m, [1, 0], [0, 1])
  })

  it('reads PaintRotateAroundCenter (26)', () => {
    const m = transformOf(26, (w) => {
      w.f2dot14(0.5)
      w.i16(10)
      w.i16(0)
    })
    expectPoint(m, [10, 0], [10, 0])
    expectPoint(m, [11, 0], [10, 1])
  })

  it('reads PaintSkew (28), tilting the y axis counter-clockwise for x', () => {
    const m = transformOf(28, (w) => {
      w.f2dot14(0.25)
      w.f2dot14(0)
    })
    expectPoint(m, [0, 1], [-1, 1])
    expectPoint(m, [1, 0], [1, 0])
  })

  it('reads PaintSkewAroundCenter (30)', () => {
    const m = transformOf(30, (w) => {
      w.f2dot14(0)
      w.f2dot14(0.25)
      w.i16(10)
      w.i16(0)
    })
    expectPoint(m, [10, 0], [10, 0])
    expectPoint(m, [11, 0], [11, 1])
  })
})

/**
 * The matrix a COLR v1 table reads for glyph 1, whose paint is a transform
 * paint in `format` wrapping a PaintGlyph and PaintSolid. `writeFields`
 * writes everything after the transform's child offset; the child follows.
 */
function transformOf(
  format: number,
  writeFields: (w: Writer) => void,
): mat.Matrix {
  const fields = new Writer()
  writeFields(fields)
  const fieldBytes = fields.toBuffer()

  const w = new Writer()
  w.u16(1) // version
  w.u16(0) // numBaseGlyphRecords
  w.u32(0) // baseGlyphRecordsOffset
  w.u32(0) // layerRecordsOffset
  w.u16(0) // numLayerRecords
  w.u32(34) // baseGlyphListOffset: right after this header
  w.u32(0) // layerListOffset
  w.u32(0) // clipListOffset
  w.u32(0) // varIndexMapOffset
  w.u32(0) // itemVariationStoreOffset

  // BaseGlyphList: glyph 1's paint is 10 bytes in, right after the list.
  w.u32(1)
  w.u16(1)
  w.u32(10)

  w.u8(format)
  w.u24(4 + fieldBytes.byteLength) // the child follows the fields
  w.buffer(fieldBytes)

  w.u8(10) // PaintGlyph
  w.u24(6) // its child follows it
  w.u16(2) // glyph 2

  w.u8(2) // PaintSolid
  w.u16(0) // palette index
  w.f2dot14(1) // alpha

  const [layer] = readColrTable(new Reader(w.toBuffer())).colorGlyph(1)!
  if (layer.format !== ColorRecordType.TRANSFORM) {
    throw new Error(`expected a transform layer, got format ${layer.format}`)
  }
  expect(layer.children[0].format).toBe(ColorRecordType.GLYPH)
  return layer.props.matrix
}

function expectPoint(m: mat.Matrix, [x, y]: number[], [ex, ey]: number[]) {
  expectPointCloseTo(mat.transformPoint(m, { x, y }), ex, ey)
}
