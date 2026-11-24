import * as mat from '@bschlenk/mat'

import type { FontHandle } from '../font-handle.js'
import { compositeGlyphComponentMatrix } from '../glyph-utils.js'
import { GlyfTag, readGlyf } from '../tables/glyf.js'
import { HmtxTableReader } from '../tables/hmtx.js'
import { LocaTableReader } from '../tables/loca.js'
import type { GlyphEnriched } from '../types.js'

export function getGlyph(font: FontHandle, id: number): GlyphEnriched {
  const loca = font.readTable(LocaTableReader)
  const hmtx = font.readTable(HmtxTableReader)
  const glyf = font.getTableView(GlyfTag)

  const offset = loca[id]
  const length = loca[id + 1] - offset

  const { advanceWidth } =
    hmtx.longHorMetrics[id] ??
    hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

  const glyph = readGlyf(glyf.subtable(offset, length))

  if (glyph.type === 'simple') return { ...glyph, id, advanceWidth }

  const { components, ...rest } = glyph
  const fullGlyph: GlyphEnriched = {
    ...rest,
    id,
    type: 'simple',
    contoursOverlap: components[0].flags.overlapCompound,
    points: [],
    endPtsOfContours: [],
    instructions: new Uint8Array(0),
    advanceWidth,
  }

  for (const c of components) {
    const subGlyph = getGlyph(font, c.glyphIndex)
    fullGlyph.endPtsOfContours.push(
      ...subGlyph.endPtsOfContours.map((i) => i + fullGlyph.points.length),
    )

    if (c.flags.argsAreXYValues) {
      const matrix = compositeGlyphComponentMatrix(c)
      const roundXYToGrid = c.flags.roundXYToGrid
      for (const p of subGlyph.points) {
        const point = mat.transformPoint(matrix, p)
        if (roundXYToGrid) {
          point.x = Math.round(point.x)
          point.y = Math.round(point.y)
        }
        fullGlyph.points.push({ ...p, ...point })
      }
    } else {
      fullGlyph.points.push(...subGlyph.points)
    }
  }

  return fullGlyph
}
