import { Reader } from '../buffer/reader.js'
import { RGBA } from '../types.js'

export class CpalTable {
  version: number
  numPaletteEntries: number
  numPalettes: number
  numColorRecords: number
  colorRecordsArrayOffset: number
  colorRecordIndices: number[]

  // version 1 only
  paletteTypesArrayOffset?: number
  paletteLabelsArrayOffset?: number
  paletteEntryLabelsArrayOffset?: number

  colorRecords: RGBA[]

  constructor(view: Reader) {
    this.version = view.u16()
    this.numPaletteEntries = view.u16()
    this.numPalettes = view.u16()
    this.numColorRecords = view.u16()
    this.colorRecordsArrayOffset = view.u32()
    this.colorRecordIndices = view.array(this.numPalettes, () => view.u16())

    if (this.version === 1) {
      this.paletteTypesArrayOffset = view.u32()
      this.paletteLabelsArrayOffset = view.u32()
      this.paletteEntryLabelsArrayOffset = view.u32()
    }

    this.colorRecords = view
      .subtable(this.colorRecordsArrayOffset)
      .array(this.numColorRecords, () => {
        const b = view.u8()
        const g = view.u8()
        const r = view.u8()
        const a = view.u8() / 255

        return { r, g, b, a }
      })
  }

  getPalette(i: number) {
    if (this.numPalettes === 1) return this.colorRecords

    const start = this.colorRecordIndices[i]
    return this.colorRecords.slice(start, start + this.numPaletteEntries)
  }

  *iterPalettes() {
    for (let i = 0; i < this.numPalettes; i++) {
      yield this.getPalette(i)
    }
  }
}

export function readCpalTable(view: Reader) {
  return new CpalTable(view)
}
