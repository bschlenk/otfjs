import * as mat from '@bschlenk/mat'

import type { Glyf, GlyfComponent, GlyfSimple } from '../types.js'
import { EMPTY_U8_ARRAY } from '../utils/utils.js'

export function emptyGlyf(): GlyfSimple {
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
export function isEmptyGlyf(glyph: Glyf): boolean {
  return (
    glyph.type === 'simple' &&
    glyph.endPtsOfContours.length === 0 &&
    glyph.instructions.length === 0
  )
}

export function glyfComponentMatrix({
  flags,
  arg1,
  arg2,
  extra,
}: GlyfComponent) {
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
