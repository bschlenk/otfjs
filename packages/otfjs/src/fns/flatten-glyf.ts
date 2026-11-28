import * as mat from '@bschlenk/mat'

import type { FontHandle } from '../font-handle.js'
import { glyfComponentMatrix } from '../glyf/glyf.utils.js'
import { type GlyfTable, GlyfTableReader } from '../tables/glyf.js'
import type { GlyfSimple, Point } from '../types.js'
import { assert } from '../utils/utils.js'

// Composites nest a few levels at most; this only stops reference cycles
const MAX_COMPONENT_DEPTH = 64

/**
 * A glyph from the glyf table as a simple glyph. Composite glyphs have
 * their components transformed and merged into one list of points, in
 * component order, which is the list their instructions run on.
 *
 * Simple glyphs are returned as the glyf table caches them, and merged
 * composites are built from those, sharing nothing but unchanged arrays.
 * Copy before editing either.
 */
export function flattenGlyf(font: FontHandle, id: number): GlyfSimple {
  return flatten(font.readTable(GlyfTableReader), id, 0)
}

function flatten(glyf: GlyfTable, id: number, depth: number): GlyfSimple {
  const glyph = glyf.get(id)
  if (glyph.type === 'simple') return glyph

  assert(
    depth < MAX_COMPONENT_DEPTH,
    `Composite glyph ${id} nests too deeply; its components may form a cycle`,
  )

  // The composite's own instructions run on the merged points, so they
  // carry over from `rest`.
  const { components, ...rest } = glyph
  const flat: GlyfSimple = {
    ...rest,
    type: 'simple',
    contoursOverlap: components[0].flags.overlapCompound,
    points: [],
    endPtsOfContours: [],
  }

  for (const c of components) {
    const component = flatten(glyf, c.glyphIndex, depth + 1)
    const start = flat.points.length
    flat.endPtsOfContours.push(
      ...component.endPtsOfContours.map((i) => i + start),
    )

    // The matrix includes the offset only when the args are x and y values
    const matrix = glyfComponentMatrix(c)
    const points = component.points.map((p) => ({
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
      alignMatchedPoints(flat.points, points, c.arg1, c.arg2)
    }

    flat.points.push(...points)
  }

  return flat
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
