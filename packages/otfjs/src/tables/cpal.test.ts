import { Reader, Writer } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { readCpalTable } from './cpal.js'

describe('CPAL', () => {
  it('reads color records from colorRecordsArrayOffset', () => {
    const w = new Writer()
    w.u16(1) // version
    w.u16(1) // numPaletteEntries
    w.u16(2) // numPalettes
    w.u16(2) // numColorRecords
    w.u32(32) // colorRecordsArrayOffset: after the header and a 4-byte gap
    w.u16(0) // colorRecordIndices[0]
    w.u16(1) // colorRecordIndices[1]
    w.u32(0) // paletteTypesArrayOffset
    w.u32(0) // paletteLabelsArrayOffset
    w.u32(0) // paletteEntryLabelsArrayOffset
    w.u32(0x09090909) // unused gap
    for (const [r, g, b, a] of [
      [1, 2, 3, 255],
      [10, 20, 30, 51],
    ]) {
      // Records are BGRA.
      w.u8(b)
      w.u8(g)
      w.u8(r)
      w.u8(a)
    }

    const cpal = readCpalTable(new Reader(w.toBuffer()))
    expect(cpal.getPalette(0)).toEqual([{ r: 1, g: 2, b: 3, a: 1 }])
    expect(cpal.getPalette(1)).toEqual([{ r: 10, g: 20, b: 30, a: 0.2 }])
  })
})
