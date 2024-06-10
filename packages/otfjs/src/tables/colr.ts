import { Reader } from '../buffer.js'
import type { ColorVisitor } from '../types.js'
import { binarySearch } from '../utils.js'

export class ColrTable {
  #view: Reader

  version: number
  numBaseGlyphRecords: number
  baseGlyphRecordsOffset: number
  layerRecordsOffset: number
  numLayerRecords: number

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

  colorGlyph(glyphId: number, visitor: ColorVisitor) {
    const record = binarySearch(
      this.baseGlyphPaintRecords!,
      glyphId,
      (r) => r.glyphId,
    )
    if (!record) return false

    this.visitLayer(visitor, this.baseGlyphListOffset! + record.paintOffset)

    return true
  }

  private visitLayer(visitor: ColorVisitor, offset: number) {
    const paintView = this.#view.subtable(offset)
    const format = paintView.u8()

    switch (format) {
      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-1-paintcolrlayers
      case 1: {
        const numLayers = paintView.u8()
        const firstLayerIndex = paintView.u32()

        for (let i = 0; i < numLayers; ++i) {
          const offset = this.paintOffsets![firstLayerIndex + i]
          this.visitLayer(visitor, this.layerListOffset! + offset)
        }

        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-2-and-3-paintsolid-paintvarsolid
      case 2: {
        const paletteIndex = paintView.u16()
        const alpha = paintView.f2dot14()

        visitor.paintSolid(paletteIndex, alpha)
        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#formats-4-and-5-paintlineargradient-paintvarlineargradient
      case 4: {
        const colorLineOffset = paintView.u24()
        const x0 = paintView.i16()
        const y0 = paintView.i16()
        const x1 = paintView.i16()
        const y1 = paintView.i16()
        const x2 = paintView.i16()
        const y2 = paintView.i16()

        const colorLineTable = this.#view.subtable(offset + colorLineOffset)
        const extend = colorLineTable.u8()
        const numStops = colorLineTable.u16()
        const stops = colorLineTable.array(numStops, () => {
          const stopOffset = colorLineTable.f2dot14()
          const paletteIndex = colorLineTable.u16()
          const alpha = colorLineTable.f2dot14()

          return { stopOffset, paletteIndex, alpha }
        })

        visitor.paintLinearGradient(
          { x: x0, y: y0 },
          { x: x1, y: y1 },
          { x: x2, y: y2 },
          extend,
          stops,
        )

        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/colr#format-10-paintglyph
      case 10: {
        const paintOffset = paintView.u24()
        const glyphId = paintView.u16()

        visitor.paintGlyph(glyphId)

        this.visitLayer(visitor, offset + paintOffset)
        break
      }

      default:
        // do nothing for now? or throw
        throw new Error(`unsupported COLR paint format ${format}`)
    }
  }
}

export function readColrTable(view: Reader) {
  return new ColrTable(view)
}
