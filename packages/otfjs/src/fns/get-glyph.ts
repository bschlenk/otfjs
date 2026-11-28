import { readCffOutline } from '../cff/cff.outline.js'
import type { FontHandle } from '../font-handle.js'
import { CffTableReader, CffTag } from '../tables/cff.js'
import { HmtxTableReader } from '../tables/hmtx.js'
import type { Glyph } from '../types.js'
import { flattenGlyf } from './flatten-glyf.js'

/**
 * A glyph with its id and advance width, from the glyf table or, in fonts
 * with CFF outlines, the CFF table. Check its `type` to tell which.
 *
 * glyf composites are flattened into simple glyphs; see `flattenGlyf`.
 * The glyph shares its points with the glyf table's cache, so copy them
 * before editing.
 */
export function getGlyph(font: FontHandle, id: number): Glyph {
  const hmtx = font.readTable(HmtxTableReader)
  const { advanceWidth } =
    hmtx.longHorMetrics[id] ??
    hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

  if (font.hasTable(CffTag) && !font.hasTable('glyf')) {
    const { outline } = readCffOutline(font.readTable(CffTableReader), id)
    return { ...outline, id, advanceWidth }
  }

  return { ...flattenGlyf(font, id), id, advanceWidth }
}
