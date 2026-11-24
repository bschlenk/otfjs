import type { Glyph, GlyphSimple } from '../types.js'
import { EMPTY_U8_ARRAY } from '../utils/utils.js'

export function emptyGlyph(): GlyphSimple {
  return {
    type: 'simple',
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    endPtsOfContours: [],
    instructions: EMPTY_U8_ARRAY,
    points: [],
    contoursOverlap: false,
  }
}

/**
 * Whether a glyph has no outline and no instructions. Empty glyphs (like
 * the space character) take no bytes in the glyf table: their loca
 * offset equals the next glyph's.
 */
export function isEmptyGlyph(glyph: Glyph): boolean {
  return (
    glyph.type === 'simple' &&
    glyph.endPtsOfContours.length === 0 &&
    glyph.instructions.length === 0
  )
}
