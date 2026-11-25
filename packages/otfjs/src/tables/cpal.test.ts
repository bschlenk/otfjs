import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { readCpalTable } from './cpal.js'

describe('CPAL', () => {
  it('reads color records from colorRecordsArrayOffset', () => {
    // A version 1 header (28 bytes for two palettes), then 4 unused bytes,
    // then the color records at offset 32, as BGRA.
    const data = new Uint8Array([
      ...[0, 1], // version
      ...[0, 1], // numPaletteEntries
      ...[0, 2], // numPalettes
      ...[0, 2], // numColorRecords
      ...[0, 0, 0, 32], // colorRecordsArrayOffset
      ...[0, 0, 0, 1], // colorRecordIndices
      ...[0, 0, 0, 0], // paletteTypesArrayOffset
      ...[0, 0, 0, 0], // paletteLabelsArrayOffset
      ...[0, 0, 0, 0], // paletteEntryLabelsArrayOffset
      ...[9, 9, 9, 9], // unused
      ...[3, 2, 1, 255], // r 1, g 2, b 3
      ...[30, 20, 10, 51], // r 10, g 20, b 30, alpha 0.2
    ])

    const cpal = readCpalTable(new Reader(data))
    expect(cpal.getPalette(0)).toEqual([{ r: 1, g: 2, b: 3, a: 1 }])
    expect(cpal.getPalette(1)).toEqual([{ r: 10, g: 20, b: 30, a: 0.2 }])
  })
})
