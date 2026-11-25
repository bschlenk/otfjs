import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import { type CmapSubtable, CmapTableWriter } from '../tables/cmap.js'
import { MetaTableWriter } from '../tables/meta.js'
import { getSampleText } from './get-sample-text.js'

describe('getSampleText', () => {
  it('uses "Aa" for fonts with Latin letters', () => {
    expect(getSampleText(makeFont({ chars: 'Aaß' }))).toBe('Aa')
  })

  it('uses the dlng sample when dlng only lists non-Latin languages', () => {
    const font = makeFont({ chars: 'Aa동', dlng: ['ko'] })
    expect(getSampleText(font)).toBe('동')
  })

  it('prefers "Aa" when dlng includes a Latin language or script', () => {
    expect(
      getSampleText(makeFont({ chars: 'Aa동', dlng: ['Latn', 'ko'] })),
    ).toBe('Aa')
    expect(getSampleText(makeFont({ chars: 'Aa동', dlng: ['ko', 'en'] }))).toBe(
      'Aa',
    )
  })

  it('tells Traditional and Simplified Chinese apart by dlng', () => {
    const chars = 'Aa漢汉'
    expect(getSampleText(makeFont({ chars, dlng: ['zh-Hant'] }))).toBe('漢')
    expect(getSampleText(makeFont({ chars, dlng: ['zh-HK'] }))).toBe('漢')
    expect(getSampleText(makeFont({ chars, dlng: ['Hant'] }))).toBe('漢')
    expect(getSampleText(makeFont({ chars, dlng: ['zh-Hans'] }))).toBe('汉')
    expect(getSampleText(makeFont({ chars, dlng: ['zh'] }))).toBe('汉')
  })

  it('skips dlng samples the font does not cover', () => {
    expect(getSampleText(makeFont({ chars: 'Aa', dlng: ['ko'] }))).toBe('Aa')
  })

  it('uses the sample of the script with the most letters', () => {
    // Khmer: more Khmer letters than Latin ones, and no "Aa".
    expect(getSampleText(makeFont({ chars: 'Bកខគ' }))).toBe('ក')
  })

  it('uses the first letter of scripts without a sample', () => {
    // Phoenician has no case.
    expect(getSampleText(makeFont({ chars: '𐤁𐤂' }))).toBe('𐤁')
  })

  it('pairs the first letter with its lowercase form in cased scripts', () => {
    // Adlam: 𞤀 (U+1E900) is uppercase and 𞤢 (U+1E922) its lowercase.
    expect(getSampleText(makeFont({ chars: '𞤀𞤁𞤢𞤣' }))).toBe('𞤀𞤢')
  })

  it('uses 😀 for emoji fonts', () => {
    expect(getSampleText(makeFont({ chars: 'ℹ😀😁' }))).toBe('😀')
  })

  it('uses the first two icons, skipping blank glyphs', () => {
    // Letters map to blank glyphs, as in icon fonts that spell out icon names
    // with ligatures.
    const font = makeFont({
      chars: 'abc',
      blank: 'abc',
    })
    expect(getSampleText(font)).toBe('')
  })

  it('uses the first two symbols of symbol fonts, not "Aa"', () => {
    // Symbol fonts map U+F020..U+F0FF, which getGlyphIndex also finds for
    // U+0020..U+00FF, so "Aa" (U+F041, U+F061) would otherwise match.
    const font = makeFont({
      chars: '',
      blank: '',
      symbol: true,
    })
    expect(getSampleText(font)).toBe('')
  })

  it('treats fonts with a symbol subtable as symbol fonts, even with a Unicode one', () => {
    const font = makeFont({
      chars: '\uf020\uf021\uf022\uf041\uf061',
      blank: '\uf020',
      symbol: true,
      alsoUnicode: true,
    })
    expect(getSampleText(font)).toBe('\uf021\uf022')
  })

  it('returns an empty string when nothing has ink', () => {
    expect(getSampleText(makeFont({ chars: 'Aa', blank: 'Aa' }))).toBe('')
  })
})

interface FontOptions {
  /** Characters to map, each to its own glyph. */
  chars: string
  /** Characters whose glyphs are blank (a single point, empty bbox). */
  blank?: string
  /** Map `chars` in a Windows symbol subtable instead of a Unicode one. */
  symbol?: boolean
  /** With `symbol`, also list the subtable as a Unicode (3, 1) one. */
  alsoUnicode?: boolean
  dlng?: string[]
}

/**
 * A font mapping each of `chars` to its own glyph, with glyf headers so
 * blank glyphs can be told apart from ones with ink.
 */
function makeFont({
  chars,
  blank = '',
  symbol = false,
  alsoUnicode = false,
  dlng,
}: FontOptions) {
  const codePoints = [...chars].map((c) => c.codePointAt(0)!)
  const blankSet = new Set([...blank].map((c) => c.codePointAt(0)!))

  // Glyph 0 is .notdef; glyph i + 1 is codePoints[i].
  const subtable: CmapSubtable =
    symbol ?
      {
        format: 4,
        language: 0,
        startCodes: [...codePoints, 0xffff],
        endCodes: [...codePoints, 0xffff],
        idDeltas: [...codePoints.map((cp, i) => i + 1 - cp), 1],
        idRangeOffsets: [...codePoints.map(() => 0), 0],
        glyphIdArray: [],
      }
    : {
        format: 12,
        language: 0,
        groups: codePoints
          .map((cp, i) => ({ cp, glyphId: i + 1 }))
          .sort((a, b) => a.cp - b.cp)
          .map(({ cp, glyphId }) => ({
            startCharCode: cp,
            endCharCode: cp,
            startGlyphId: glyphId,
          })),
      }

  const cmap = CmapTableWriter.write({
    version: 0,
    encodingRecords: [
      { platformId: 3, encodingId: symbol ? 0 : 10, subtable },
      ...(alsoUnicode ? [{ platformId: 3, encodingId: 1, subtable }] : []),
    ],
  })

  // Every glyph is just a 10-byte header: numberOfContours and a bbox.
  const numGlyphs = codePoints.length + 1
  const glyf = new Uint8Array(numGlyphs * 10)
  const glyfView = new DataView(glyf.buffer)
  codePoints.forEach((cp, i) => {
    const offset = (i + 1) * 10
    glyfView.setInt16(offset, 1)
    if (!blankSet.has(cp)) {
      glyfView.setInt16(offset + 6, 100) // xMax
      glyfView.setInt16(offset + 8, 100) // yMax
    }
  })

  const loca = new Uint8Array((numGlyphs + 1) * 4)
  const locaView = new DataView(loca.buffer)
  for (let i = 0; i <= numGlyphs; ++i) locaView.setUint32(i * 4, i * 10)

  const tables: Record<string, Uint8Array> = {
    cmap,
    glyf,
    loca,
    head: head(1),
    maxp: maxp(numGlyphs),
  }
  if (dlng) {
    tables.meta = MetaTableWriter.write({
      version: 1,
      flags: 0,
      designLanguages: dlng,
      supportedLanguages: null,
      other: [],
    })
  }

  return new FontHandle(buildFont({ tables }))
}

function head(indexToLocFormat: number) {
  const data = new Uint8Array(54)
  const view = new DataView(data.buffer)
  view.setUint16(0, 1) // majorVersion
  view.setUint32(12, 0x5f0f3cf5) // magicNumber
  view.setUint16(18, 1000) // unitsPerEm
  view.setInt16(48, 2) // fontDirectionHint
  view.setInt16(50, indexToLocFormat)
  return data
}

function maxp(numGlyphs: number) {
  const data = new Uint8Array(6)
  const view = new DataView(data.buffer)
  view.setUint32(0, 0x00005000) // version 0.5
  view.setUint16(4, numGlyphs)
  return data
}
