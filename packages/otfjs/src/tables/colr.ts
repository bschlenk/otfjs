import * as mat from '@bschlenk/mat'
import * as vec from '@bschlenk/vec'

import { Reader } from '../buffer/reader.js'
import type { Extend } from '../enums.js'
import { binarySearch } from '../utils/binary-search.js'

export enum CompositeMode {
  CLEAR = 0,
  // Source ("Copy” in Composition & Blending Level 1)
  SRC = 1,
  // Destination
  DEST = 2,
  // Source Over
  SRC_OVER = 3,
  // Destination Over
  DEST_OVER = 4,
  // Source In
  SRC_IN = 5,
  // Destination In
  DEST_IN = 6,
  // Source Out
  SRC_OUT = 7,
  // Destination Out
  DEST_OUT = 8,
  // Source Atop
  SRC_ATOP = 9,
  // Destination Atop
  DEST_ATOP = 10,
  XOR = 11,
  // Plus (“Lighter” in Composition & Blending Level 1)
  PLUS = 12,

  // Separable color blend modes:

  SCREEN = 13,
  OVERLAY = 14,
  DARKEN = 15,
  LIGHTEN = 16,
  COLOR_DODGE = 17,
  COLOR_BURN = 18,
  HARD_LIGHT = 19,
  SOFT_LIGHT = 20,
  DIFFERENCE = 21,
  EXCLUSION = 22,
  MULTIPLY = 23,

  // Non-separable color blend modes:

  HSL_HUE = 24,
  HSL_SATURATION = 25,
  HSL_COLOR = 26,
  HSL_LUMINOSITY = 27,
}

export enum ColorRecordType {
  SOLID = 2,
  LINEAR_GRADIENT = 4,
  RADIAL_GRADIENT = 6,
  GLYPH = 10,
  TRANSFORM = 12,
  COMPOSITE = 32,
}

export interface ColorStop {
  stopOffset: number
  paletteIndex: number
  alpha: number
}

export interface ColorLayerBase<T extends ColorRecordType> {
  format: T
  props: ColorRecordPropsMap[T]
  children: ColorLayer[]
}

export type ColorLayer =
  | ColorLayerBase<ColorRecordType.SOLID>
  | ColorLayerBase<ColorRecordType.LINEAR_GRADIENT>
  | ColorLayerBase<ColorRecordType.RADIAL_GRADIENT>
  | ColorLayerBase<ColorRecordType.GLYPH>
  | ColorLayerBase<ColorRecordType.TRANSFORM>
  | ColorLayerBase<ColorRecordType.COMPOSITE>

export interface ColorRecordPropsMap {
  [ColorRecordType.SOLID]: { paletteIndex: number; alpha: number }
  [ColorRecordType.LINEAR_GRADIENT]: {
    p0: vec.Vector
    p1: vec.Vector
    p2: vec.Vector
    extend: Extend
    stops: ColorStop[]
  }
  [ColorRecordType.RADIAL_GRADIENT]: {
    p0: vec.Vector
    p1: vec.Vector
    r0: number
    r1: number
    extend: Extend
    stops: ColorStop[]
  }
  [ColorRecordType.GLYPH]: { glyphId: number }
  [ColorRecordType.TRANSFORM]: { matrix: mat.Matrix }
  [ColorRecordType.COMPOSITE]: {
    mode: CompositeMode
    src: ColorLayer[]
    dest: ColorLayer[]
  }
}

export class ColrTable {
  #view: Reader

  version: number
  numBaseGlyphRecords: number
  baseGlyphRecordsOffset: number
  layerRecordsOffset: number
  numLayerRecords: number

  baseGlyphRecords?: {
    glyphId: number
    firstLayerIndex: number
    numLayers: number
  }[]
  layerRecords?: { glyphId: number; paletteIndex: number }[]

  // version 1 only
  baseGlyphListOffset?: number
  layerListOffset?: number
  clipListOffset?: number
  varIndexMapOffset?: number
  itemVariationStoreOffset?: number

  baseGlyphPaintRecords?: { glyphId: number; paintOffset: number }[]
  paintOffsets?: number[]

  constructor(view: Reader) {
    this.#view = view

    this.version = view.u16()

    if (this.version !== 0 && this.version !== 1) {
      throw new Error(`Unsupported COLR table version: ${this.version}`)
    }

    this.numBaseGlyphRecords = view.u16()
    this.baseGlyphRecordsOffset = view.u32()
    this.layerRecordsOffset = view.u32()
    this.numLayerRecords = view.u16()

    if (this.baseGlyphRecordsOffset > 0) {
      this.baseGlyphRecords = view
        .subtable(this.baseGlyphRecordsOffset)
        .array(this.numBaseGlyphRecords, (v) => {
          const glyphId = v.u16()
          const firstLayerIndex = v.u16()
          const numLayers = v.u16()
          return { glyphId, firstLayerIndex, numLayers }
        })
    }

    if (this.layerRecordsOffset > 0) {
      this.layerRecords = view
        .subtable(this.layerRecordsOffset)
        .array(this.numLayerRecords, (v) => {
          const glyphId = v.u16()
          const paletteIndex = v.u16()
          return { glyphId, paletteIndex }
        })
    }

    if (this.version === 1) {
      this.baseGlyphListOffset = view.u32()
      this.layerListOffset = view.u32()
      this.clipListOffset = view.u32()
      this.varIndexMapOffset = view.u32()
      this.itemVariationStoreOffset = view.u32()

      if (this.baseGlyphListOffset > 0) {
        const baseGlyphListTable = view.subtable(this.baseGlyphListOffset)
        const numBaseGlyphPaintRecords = baseGlyphListTable.u32()
        this.baseGlyphPaintRecords = baseGlyphListTable.array(
          numBaseGlyphPaintRecords,
          () => {
            const glyphId = baseGlyphListTable.u16()
            const paintOffset = baseGlyphListTable.u32()

            return { glyphId, paintOffset }
          },
        )
      }

      if (this.layerListOffset > 0) {
        const layerListTable = view.subtable(this.layerListOffset)
        const numLayers = layerListTable.u32()
        this.paintOffsets = layerListTable.array(numLayers, () =>
          layerListTable.u32(),
        )
      }
    }
  }

  colorGlyph(glyphId: number) {
    if (this.baseGlyphPaintRecords) {
      const record = binarySearch(
        this.baseGlyphPaintRecords,
        glyphId,
        (r) => r.glyphId,
      )

      if (record) {
        const offset = this.baseGlyphListOffset! + record.paintOffset
        return this.visitLayer(this.#view.subtable(offset))
      }
    }

    if (this.baseGlyphRecords) {
      const record = binarySearch(
        this.baseGlyphRecords,
        glyphId,
        (r) => r.glyphId,
      )

      if (record) {
        const layers: ColorLayer[] = []

        for (let i = 0; i < record.numLayers; ++i) {
          const idx = record.firstLayerIndex + i
          const { glyphId, paletteIndex } = this.layerRecords![idx]
          layers.push({
            format: ColorRecordType.GLYPH,
            props: { glyphId },
            children: [
              {
                format: ColorRecordType.SOLID,
                props: { paletteIndex, alpha: 1 },
                children: [],
              },
            ],
          })
        }

        return layers
      }
    }

    return null
  }

  private visitLayer(view: Reader): ColorLayer[] {
    const format = view.u8()

    switch (format) {
      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-1-paintcolrlayers
      case 1: {
        const numLayers = view.u8()
        const firstLayerIndex = view.u32()

        const layers: ColorLayer[] = []

        for (let i = 0; i < numLayers; ++i) {
          const offset = this.paintOffsets![firstLayerIndex + i]
          layers.push(
            ...this.visitLayer(
              this.#view.subtable(this.layerListOffset! + offset),
            ),
          )
        }

        return layers
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-2-and-3-paintsolid-paintvarsolid
      case 2: {
        const paletteIndex = view.u16()
        const alpha = view.f2dot14()
        return [{ format, props: { paletteIndex, alpha }, children: [] }]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-4-and-5-paintlineargradient-paintvarlineargradient
      case 4: {
        const colorLineOffset = view.u24()
        const x0 = view.i16()
        const y0 = view.i16()
        const x1 = view.i16()
        const y1 = view.i16()
        const x2 = view.i16()
        const y2 = view.i16()

        const { extend, stops } = readColorLine(view.subtable(colorLineOffset))

        const p0 = vec.vec(x0, y0)
        const p1 = vec.vec(x1, y1)
        const p2 = vec.vec(x2, y2)

        if (vec.equals(p0, p1) || vec.equals(p0, p2)) {
          // ill-formed gradient
          return []
        }

        return [{ format, props: { p0, p1, p2, extend, stops }, children: [] }]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-6-and-7-paintradialgradient-paintvarradialgradient
      case 6: {
        const colorLineOffset = view.u24()
        const x0 = view.i16()
        const y0 = view.i16()
        const r0 = view.u16()
        const x1 = view.i16()
        const y1 = view.i16()
        const r1 = view.u16()

        const { extend, stops } = readColorLine(view.subtable(colorLineOffset))

        const p0 = vec.vec(x0, y0)
        const p1 = vec.vec(x1, y1)

        return [
          { format, props: { p0, p1, r0, r1, extend, stops }, children: [] },
        ]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-10-paintglyph
      case 10: {
        const paintOffset = view.u24()
        const glyphId = view.u16()

        const children = this.visitLayer(view.subtable(paintOffset))

        return [{ format, props: { glyphId }, children }]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-11-paintcolrglyph
      case 11: {
        const glyphId = view.u16()
        return this.colorGlyph(glyphId) || []
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-12-and-13-painttransform-paintvartransform
      case 12: {
        const paintOffset = view.u24()
        const transformOffset = view.u24()
        const matrix = readAffine2x3(view.subtable(transformOffset))

        const children = this.visitLayer(view.subtable(paintOffset))

        return [{ format, props: { matrix }, children }]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-14-and-15-painttranslate-paintvartranslate
      case 14: {
        const paintOffset = view.u24()
        const dx = view.i16()
        const dy = view.i16()
        const matrix = mat.translate(dx, dy)

        const children = this.visitLayer(view.subtable(paintOffset))

        return [
          { format: ColorRecordType.TRANSFORM, props: { matrix }, children },
        ]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-16-to-23-paintscale-and-variant-scaling-formats
      case 16: {
        const paintOffset = view.u24()
        const scaleX = view.f2dot14()
        const scaleY = view.f2dot14()
        const matrix = mat.scale(scaleX, scaleY)

        const children = this.visitLayer(view.subtable(paintOffset))

        return [
          { format: ColorRecordType.TRANSFORM, props: { matrix }, children },
        ]
      }

      case 18: {
        const paintOffset = view.u24()
        const scaleX = view.f2dot14()
        const scaleY = view.f2dot14()
        const centerX = view.i16()
        const centerY = view.i16()
        const matrix = mat.scaleAt(scaleX, scaleY, centerX, centerY)

        const children = this.visitLayer(view.subtable(paintOffset))

        return [
          { format: ColorRecordType.TRANSFORM, props: { matrix }, children },
        ]
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-32-paintcomposite
      case 32: {
        const sourcePaintOffset = view.u24()
        const mode: CompositeMode = view.u8()
        const destPaintOffset = view.u24()

        const src = this.visitLayer(view.subtable(sourcePaintOffset))
        const dest = this.visitLayer(view.subtable(destPaintOffset))

        return [{ format, props: { mode, src, dest }, children: [] }]
      }

      default:
        throw new Error(`TODO: unsupported COLR paint format ${format}`)
    }
  }
}

export function readColrTable(view: Reader) {
  return new ColrTable(view)
}

function readAffine2x3(view: Reader) {
  const xx = view.f16dot16()
  const xy = view.f16dot16()
  const yx = view.f16dot16()
  const yy = view.f16dot16()
  const dx = view.f16dot16()
  const dy = view.f16dot16()

  return mat.mat(xx, xy, yx, yy, dx, dy)
}

function readColorLine(view: Reader) {
  const extend = view.u8()
  const numStops = view.u16()
  const stops = view.array(numStops, () => {
    const stopOffset = view.f2dot14()
    const paletteIndex = view.u16()
    const alpha = view.f2dot14()

    return { stopOffset, paletteIndex, alpha }
  })

  return { extend, stops }
}
