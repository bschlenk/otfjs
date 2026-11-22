import { describe, expect, it } from 'vitest'

import { Font } from './font.js'
import { buildFont } from './font-builder.js'
import { CvtTableReader } from './tables/cvt.js'

function makeFont(tables: Record<string, number[]>) {
  return new Font(
    buildFont({
      tables: Object.fromEntries(
        Object.entries(tables).map(([tag, b]) => [tag, new Uint8Array(b)]),
      ),
    }),
  )
}

describe('Font.getTable', () => {
  it('reads tables by tag with the built-in readers', () => {
    const font = makeFont({ 'cvt ': [0, 1, 0xff, 0xff] })
    expect(font.getTable('cvt ')).toEqual([1, -1])
  })

  it('shares its cache with readTable', () => {
    const font = makeFont({ 'cvt ': [0, 1, 0xff, 0xff] })
    expect(font.getTable('cvt ')).toBe(font.readTable(CvtTableReader))
  })

  it('throws when the table is missing', () => {
    expect(() => makeFont({}).getTable('cvt ')).toThrow(
      '"cvt " table not found',
    )
  })

  it('throws for tables without a built-in reader', () => {
    const font = makeFont({ GSUB: [0, 0, 0, 0], glyf: [0, 0, 0, 0] })
    expect(() => font.getTable('GSUB')).toThrow(
      'no built-in reader for the "GSUB" table',
    )
    expect(() => font.getTable('glyf')).toThrow('call getGlyph')
  })
})

describe('Font.getTableOrNull', () => {
  it('returns null when the table is missing', () => {
    expect(makeFont({}).getTableOrNull('cvt ')).toBeNull()
    expect(makeFont({}).getTableOrNull('GSUB')).toBeNull()
  })
})
