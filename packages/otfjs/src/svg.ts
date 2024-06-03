import { walkGlyphPath } from './glyph-utils.js'
import { SvgPathBuilder } from './path-builder.js'
import { Glyph } from './tables/glyf.js'

export function glyphToSvgPath(glyph: Glyph) {
  const path = new SvgPathBuilder()
  walkGlyphPath(glyph, path)
  return path.toString()
}
