import type { FontHandle } from '../font-handle.js'
import type { GlyphEnriched } from '../types.js'
import { getGlyph } from './get-glyph.js'
import { getGlyphIndex } from './get-glyph-index.js'

export function getGlyphByCodePoint(font: FontHandle, codePoint: number): GlyphEnriched {
  return getGlyph(font, getGlyphIndex(font, codePoint))
}
