import * as mat from '@bschlenk/mat'

import type { Reader } from './buffer/reader.js'
import { createFlagReader } from './flags.js'
import { PathBuilder } from './path-builder.js'
import type { Glyph, GlyphCompositeComponent, Point } from './types.js'

export const glyphFlags = createFlagReader({
  onCurvePoint: 0,
  xShortVector: 1,
  yShortVector: 2,
  repeat: 3,
  xIsSameOrPositiveXShortVector: 4,
  yIsSameOrPositiveYShortVector: 5,
  contoursOverlap: 6,
})

export type GlyphFlags = ReturnType<typeof glyphFlags>

export const glyphCompositeFlags = createFlagReader({
  arg1And2AreWords: 0,
  argsAreXYValues: 1,
  roundXYToGrid: 2,
  weHaveAScale: 3,
  moreComponents: 5,
  weHaveAnXAndYScale: 6,
  weHaveATwoByTwo: 7,
  weHaveInstructions: 8,
  useMyMetrics: 9,
  overlapCompound: 10,
  scaledComponentOffset: 11,
  unscaledComponentOffset: 12,
})

export type GlyphCompositeFlags = ReturnType<typeof glyphCompositeFlags>

export function readCompositeGlyphComponent(
  view: Reader,
): GlyphCompositeComponent {
  const flags = glyphCompositeFlags(view.u16())
  const glyphIndex = view.u16()

  let arg1: number, arg2: number

  if (flags.arg1And2AreWords) {
    if (flags.argsAreXYValues) {
      arg1 = view.i16()
      arg2 = view.i16()
    } else {
      arg1 = view.u16()
      arg2 = view.u16()
    }
  } else {
    if (flags.argsAreXYValues) {
      arg1 = view.i8()
      arg2 = view.i8()
    } else {
      arg1 = view.u8()
      arg2 = view.u8()
    }
  }

  const extra: number[] = []

  if (flags.weHaveAScale) {
    extra.push(view.f2dot14())
  } else if (flags.weHaveAnXAndYScale) {
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
  } else if (flags.weHaveATwoByTwo) {
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
  }

  return { flags, glyphIndex, arg1, arg2, extra }
}

export function compositeGlyphComponentMatrix({
  flags,
  arg1,
  arg2,
  extra,
}: GlyphCompositeComponent) {
  const xAndYAreScaled =
    flags.scaledComponentOffset && !flags.unscaledComponentOffset

  let matrix = mat.IDENTITY

  switch (extra.length) {
    case 1:
    case 2:
      matrix = mat.mult(matrix, mat.scale(...(extra as [number, number])))
      break
    case 4:
      matrix = mat.mult(
        matrix,
        mat.mat(...(extra as [number, number, number, number]), 0, 0),
      )
      break
  }

  if (flags.argsAreXYValues) {
    const translation = mat.translate(arg1, arg2)
    matrix =
      xAndYAreScaled ?
        mat.mult(translation, matrix)
      : mat.mult(matrix, translation)
  }

  return matrix
}

export function walkGlyphPath(glyph: Glyph, path: PathBuilder) {
  if (glyph.type === 'composite') {
    console.log(glyph)
    return
  }

  let i = 0
  for (const endIndex of glyph.endPtsOfContours) {
    let start = glyph.points[i++]

    if (!start.onCurve) {
      const last = glyph.points[endIndex]
      if (last.onCurve) {
        start = last
      } else {
        start = midpoint(start, last)
      }
      // walk i back so we handle the off curve point as we enter the loop
      --i
    }

    path.moveTo(start)

    while (i <= endIndex) {
      const point = glyph.points[i++]

      if (point.onCurve) {
        path.lineTo(point)
        continue
      }

      const next = glyph.points[i]
      let end = next

      if (i > endIndex) {
        // the last point
        end = start
      } else if (next.onCurve) {
        end = next
        ++i
      } else {
        end = midpoint(point, next)
      }

      path.quadraticCurveTo(point, end)
    }

    path.closePath()
  }
}

function midpoint(p1: Point, p2: Point) {
  // TODO: round this to the grid
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    onCurve: true,
  }
}
