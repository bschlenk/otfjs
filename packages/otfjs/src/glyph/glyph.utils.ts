import * as mat from '@bschlenk/mat'

import { createFlagReader } from '../flags.js'
import type { Glyph, GlyphCompositeComponent, GlyphSimple } from '../types.js'
import { EMPTY_U8_ARRAY } from '../utils/utils.js'

export function emptyGlyph(): GlyphSimple {
  return {
    type: 'simple',
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    endPtsOfContours: [],
    instructions: EMPTY_U8_ARRAY,
    points: [],
    contoursOverlap: false,
  }
}

/**
 * Whether a glyph has no outline and no instructions. Empty glyphs (like
 * the space character) take no bytes in the glyf table: their loca
 * offset equals the next glyph's.
 */
export function isEmptyGlyph(glyph: Glyph): boolean {
  return (
    glyph.type === 'simple' &&
    glyph.endPtsOfContours.length === 0 &&
    glyph.instructions.length === 0
  )
}

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
