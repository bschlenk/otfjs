import { walkGlyphPath } from './glyph-utils.js'
import { CanvasPathBuilder } from './path-builder.js'
import { Glyph } from './tables/glyf.js'

export function renderGlyphToCanvas(
  glyph: Glyph,
  ctx: CanvasRenderingContext2D,
) {
  const path = new CanvasPathBuilder(ctx)
  ctx.beginPath()
  walkGlyphPath(glyph, path)
}
