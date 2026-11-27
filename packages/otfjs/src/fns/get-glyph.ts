import * as mat from '@bschlenk/mat'

import type { FontHandle } from '../font-handle.js'
import { readGlyf } from '../glyf/glyf.read.js'
import { glyfComponentMatrix } from '../glyf/glyf.utils.js'
import { GlyfTag } from '../tables/glyf.js'
import { HmtxTableReader } from '../tables/hmtx.js'
import { LocaTableReader } from '../tables/loca.js'
import type { Glyph, Point } from '../types.js'
import { assert } from '../utils/utils.js'

export function getGlyph(font: FontHandle, id: number): Glyph {
  const loca = font.readTable(LocaTableReader)
  const hmtx = font.readTable(HmtxTableReader)
  const glyf = font.getTableView(GlyfTag)

  const offset = loca[id]
  const length = loca[id + 1] - offset

  const { advanceWidth } =
    hmtx.longHorMetrics[id] ??
    hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

  const glyph = readGlyf(glyf.subtable(offset, length))

  if (glyph.type === 'simple') {
    // readGlyf returned a fresh object, so add to it rather than copying
    const enriched = glyph as Glyph
    enriched.id = id
    enriched.advanceWidth = advanceWidth
    return enriched
  }

  // The composite's own instructions run on the merged points, so they
  // carry over from `rest`.
  const { components, ...rest } = glyph
  const fullGlyph: Glyph = {
    ...rest,
    id,
    type: 'simple',
    contoursOverlap: components[0].flags.overlapCompound,
    points: [],
    endPtsOfContours: [],
    advanceWidth,
  }

  for (const c of components) {
    const subGlyph = getGlyph(font, c.glyphIndex)
    const start = fullGlyph.points.length
    fullGlyph.endPtsOfContours.push(
      ...subGlyph.endPtsOfContours.map((i) => i + start),
    )

    // The matrix includes the offset only when the args are x and y values
    const matrix = glyfComponentMatrix(c)
    const points = subGlyph.points.map((p) => ({
      ...p,
      ...mat.transformPoint(matrix, p),
    }))

    if (c.flags.argsAreXYValues) {
      if (c.flags.roundXYToGrid) {
        for (const p of points) {
          p.x = Math.round(p.x)
          p.y = Math.round(p.y)
        }
      }
    } else {
      alignMatchedPoints(fullGlyph.points, points, c.arg1, c.arg2)
    }

    fullGlyph.points.push(...points)
  }

  return fullGlyph
}

/**
 * Moves a component's points so its point `childIndex` lands on point
 * `parentIndex` of the points merged so far. Components use this when their
 * args are point numbers rather than an x and y offset.
 */
function alignMatchedPoints(
  parentPoints: Point[],
  childPoints: Point[],
  parentIndex: number,
  childIndex: number,
) {
  const parent = parentPoints[parentIndex]
  const child = childPoints[childIndex]
  assert(
    parent !== undefined && child !== undefined,
    `Composite glyph matches point ${parentIndex} to component point ${childIndex}, which doesn't exist`,
  )

  const dx = parent.x - child.x
  const dy = parent.y - child.y
  for (const p of childPoints) {
    p.x += dx
    p.y += dy
  }
}
