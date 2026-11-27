import { walkGlyphPath } from './glyph/glyph.path.js'
import { CanvasPathBuilder } from './path-builder.js'
import type { GlyphOutline } from './types.js'

export function renderGlyphToCanvas(
  glyph: GlyphOutline,
  ctx: CanvasRenderingContext2D,
) {
  const path = new CanvasPathBuilder(ctx)
  ctx.beginPath()
  walkGlyphPath(glyph, path)
}
