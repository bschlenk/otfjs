import type { FontHandle } from '../font-handle.js'
import { HmtxTableReader } from '../tables/hmtx.js'
import type { Glyph } from '../types.js'
import { flattenGlyf } from './flatten-glyf.js'

/**
 * A glyph with its id and advance width. Composite glyphs are flattened
 * into simple ones; see `flattenGlyf`. The glyph shares its points with
 * the glyf table's cache, so copy them before editing.
 */
export function getGlyph(font: FontHandle, id: number): Glyph {
  const hmtx = font.readTable(HmtxTableReader)
  const { advanceWidth } =
    hmtx.longHorMetrics[id] ??
    hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

  return { ...flattenGlyf(font, id), id, advanceWidth }
}
