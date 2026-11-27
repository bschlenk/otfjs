import { walkGlyfPath } from './glyf/glyf.path.js'
import { CanvasPathBuilder } from './path-builder.js'
import type { GlyfSimple } from './types.js'

export function renderGlyphToCanvas(
  glyph: GlyfSimple,
  ctx: CanvasRenderingContext2D,
) {
  const path = new CanvasPathBuilder(ctx)
  ctx.beginPath()
  walkGlyfPath(glyph, path)
}
