import { walkGlyfPath } from '../glyf/glyf.path.js'
import type { PathBuilder } from '../path-builder.js'
import type { GlyphOutline, PathCommand } from '../types.js'

/** Draw a glyph outline, from either the glyf or the CFF table. */
export function walkGlyphPath(glyph: GlyphOutline, path: PathBuilder) {
  if (glyph.type === 'simple') {
    walkGlyfPath(glyph, path)
  } else {
    replayPath(glyph.commands, path)
  }
}

/** Draw recorded path commands. */
export function replayPath(commands: PathCommand[], path: PathBuilder) {
  for (const c of commands) {
    switch (c.type) {
      case 'moveTo':
        path.moveTo(c)
        break
      case 'lineTo':
        path.lineTo(c)
        break
      case 'quadraticCurveTo':
        path.quadraticCurveTo({ x: c.x1, y: c.y1 }, c)
        break
      case 'cubicCurveTo':
        path.cubicCurveTo({ x: c.x1, y: c.y1 }, { x: c.x2, y: c.y2 }, c)
        break
      case 'closePath':
        path.closePath()
        break
    }
  }
}
