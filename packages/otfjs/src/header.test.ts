import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { NotAFontError } from './errors.js'
import { readHeader } from './header.js'

describe('readHeader', () => {
  it('throws NotAFontError for data without a font signature', () => {
    const data = new TextEncoder().encode('definitely not a font file')
    expect(() => readHeader(new Reader(data))).toThrow(NotAFontError)
  })

  it('throws NotAFontError for data shorter than a signature', () => {
    expect(() => readHeader(new Reader(new Uint8Array([0, 1])))).toThrow(
      NotAFontError,
    )
  })

  it('reads a header with a TrueType signature', () => {
    // sfntVersion 0x00010000 followed by numTables = 0 and three u16 fields
    const data = new Uint8Array([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
    expect(readHeader(new Reader(data))).toMatchObject({
      sfntVersion: 0x00010000,
      numTables: 0,
      tables: [],
    })
  })
})
