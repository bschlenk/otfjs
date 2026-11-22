import type { FontHandle } from '../font-handle.js'
import { MaxpTableReader } from '../tables/maxp.js'
import type { GlyphEnriched } from '../types.js'
import { getGlyph } from './get-glyph.js'

export function* glyphs(font: FontHandle): Generator<GlyphEnriched> {
  const { numGlyphs } = font.readTable(MaxpTableReader)
  for (let i = 0; i < numGlyphs; ++i) {
    yield getGlyph(font, i)
  }
}
