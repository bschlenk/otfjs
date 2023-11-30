// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { Reader } from '../buffer.js'
import { Matrix } from '../matrix.js'
import { assert } from '../utils.js'

interface GlyphBase<T extends string> {
  type: T
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

export interface GlyphSimple extends GlyphBase<'simple'> {
  endPtsOfContours: number[]
  instructions: number[]
  points: Point[]
  contoursOverlap: boolean
}

export interface GlyphComposite extends GlyphBase<'composite'> {
  components: GlyphCompositeComponent[]
}

export type Glyph = GlyphSimple | GlyphComposite

interface GlyphCompositeComponent {
  flags: number
  glyphIndex: number
  arg1: number
  arg2: number
  matrix: Matrix
}

export interface Point {
  x: number
  y: number
  onCurve: boolean
}

interface Flag {
  onCurvePoint: boolean
  xShortVector: boolean
  yShortVector: boolean
  xIsSameOrPositiveXShortVector: boolean
  yIsSameOrPositiveYShortVector: boolean
}

/**
 * This reader is a special case, where the `view` is expected to already
 * incorporate the offset into the glyph table to the desired glyph. The glyph
 * offset can be determined by reading the `loca` table. The glyph length can be
 * determined by looking at glyphIndex + 1.
 *
 * @param view
 */
export function readGlyf(view: Reader): Glyph {
  if (view.length === 0) return emptyGlyph()

  const numberOfContours = view.i16()
  const isComposite = numberOfContours < 0

  if (isComposite) {
    assert(
      numberOfContours === -1,
      `Invalid numberOfContours ${numberOfContours} for composite glyph composite glyph`,
    )
  }

  const xMin = view.i16()
  const yMin = view.i16()
  const xMax = view.i16()
  const yMax = view.i16()

  if (isComposite) {
    const components = readCompositeGlyph(view)
    const glyph: GlyphComposite = {
      type: 'composite',
      xMin,
      yMin,
      xMax,
      yMax,
      components,
    }
    return glyph
  }

  const endPtsOfContours = view.array(numberOfContours, () => view.u16())
  const instructionLength = view.u16()
  const instructions = view.array(instructionLength, () => view.u8())

  const numEntries = endPtsOfContours[endPtsOfContours.length - 1] + 1

  const { flags, contoursOverlap } = readFlags(numEntries, view)
  const xCoordinates = readXCoordinates(flags, view)
  const yCoordinates = readYCoordinates(flags, view)
  const points = combinePoints(flags, xCoordinates, yCoordinates)

  const glyph: GlyphSimple = {
    type: 'simple',
    xMin,
    yMin,
    xMax,
    yMax,
    endPtsOfContours,
    instructions,
    points,
    contoursOverlap,
  }

  return glyph
}

function readFlags(count: number, view: Reader) {
  let contoursOverlap = false

  const flags: Flag[] = []
  while (flags.length < count) {
    const flag = view.u8()

    const onCurvePoint = Boolean(flag & (1 << 0))
    const xShortVector = Boolean(flag & (1 << 1))
    const yShortVector = Boolean(flag & (1 << 2))
    const repeat = Boolean(flag & (1 << 3))
    const xIsSameOrPositiveXShortVector = Boolean(flag & (1 << 4))
    const yIsSameOrPositiveYShortVector = Boolean(flag & (1 << 5))

    if (flags.length === 0) {
      contoursOverlap = Boolean(flag & (1 << 6))
    }

    const flagData = {
      onCurvePoint,
      xShortVector,
      yShortVector,
      xIsSameOrPositiveXShortVector,
      yIsSameOrPositiveYShortVector,
    }

    flags.push(flagData)

    if (repeat) {
      const count = view.u8()
      for (let i = 0; i < count; ++i) {
        flags.push(flagData)
      }
    }
  }

  return { flags, contoursOverlap }
}

function readXCoordinates(flags: Flag[], view: Reader) {
  const xCoordinates: number[] = []
  for (const flag of flags) {
    if (flag.xShortVector) {
      const x = view.u8()
      xCoordinates.push(flag.xIsSameOrPositiveXShortVector ? x : -x)
    } else {
      if (flag.xIsSameOrPositiveXShortVector) {
        xCoordinates.push(0)
      } else {
        const x = view.i16()
        xCoordinates.push(x)
      }
    }
  }

  return xCoordinates
}

function readYCoordinates(flags: Flag[], view: Reader) {
  const yCoordinates: number[] = []
  for (const flag of flags) {
    if (flag.yShortVector) {
      const y = view.u8()
      yCoordinates.push(flag.yIsSameOrPositiveYShortVector ? y : -y)
    } else {
      if (flag.yIsSameOrPositiveYShortVector) {
        yCoordinates.push(0)
      } else {
        const y = view.i16()
        yCoordinates.push(y)
      }
    }
  }

  return yCoordinates
}

function combinePoints(
  flags: Flag[],
  xCoordinates: number[],
  yCoordinates: number[],
) {
  const points: Point[] = []
  for (let i = 0; i < flags.length; ++i) {
    const prevPoint = points[i - 1] ?? { x: 0, y: 0 }
    const x = xCoordinates[i] + prevPoint.x
    const y = yCoordinates[i] + prevPoint.y
    const onCurve = flags[i].onCurvePoint
    points.push({ x, y, onCurve })
  }

  return points
}

function readCompositeGlyph(view: Reader) {
  const components: GlyphCompositeComponent[] = []

  let more = true
  while (more) {
    const result = readCompositeGlyphComponent(view)
    components.push(result.component)
    more = result.more
  }

  return components
}

function readCompositeGlyphComponent(view: Reader) {
  const flags = view.u16()
  const glyphIndex = view.u16()

  const arg1And2AreWords = Boolean(flags & (1 << 0))
  const argsAreXYValues = Boolean(flags & (1 << 1))
  const weHaveAScale = Boolean(flags & (1 << 3))
  const more = Boolean(flags & (1 << 5))
  const weHaveAnXAndYScale = Boolean(flags & (1 << 6))
  const weHaveATwoByTwo = Boolean(flags & (1 << 7))
  const scaledComponentOffset = Boolean(flags & (1 << 11))
  const unscaledComponentOffset = Boolean(flags & (1 << 12))

  const xAndYAreScaled = scaledComponentOffset && !unscaledComponentOffset

  /*
  const argsAreXYValues = Boolean(flags & (1 << 1))
  const roundXYToGrid = Boolean(flags & (1 << 2))
  const weHaveInstructions = Boolean(flags & (1 << 8))
  const useMyMetrics = Boolean(flags & (1 << 9))
  const overlapCompound = Boolean(flags & (1 << 10))
  */

  let arg1: number, arg2: number

  if (arg1And2AreWords) {
    if (argsAreXYValues) {
      arg1 = view.i16()
      arg2 = view.i16()
    } else {
      arg1 = view.u16()
      arg2 = view.u16()
    }
  } else {
    if (argsAreXYValues) {
      arg1 = view.i8()
      arg2 = view.i8()
    } else {
      arg1 = view.u8()
      arg2 = view.u8()
    }
  }

  const extra: number[] = []

  if (weHaveAScale) {
    extra.push(view.f2dot14())
  } else if (weHaveAnXAndYScale) {
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
  } else if (weHaveATwoByTwo) {
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
    extra.push(view.f2dot14())
  }

  let matrix = Matrix.identity()

  switch (extra.length) {
    case 1:
    case 2:
      matrix = matrix.mult(Matrix.withScale(...(extra as [number, number])))
      break
    case 4:
      matrix = matrix.mult(
        new Matrix(...(extra as [number, number, number, number]), 0, 0),
      )
  }

  if (argsAreXYValues) {
    const translation = Matrix.withTranslation(arg1, arg2)
    matrix = xAndYAreScaled
      ? translation.mult(matrix)
      : matrix.mult(translation)
  }

  const component: GlyphCompositeComponent = {
    flags,
    glyphIndex,
    arg1,
    arg2,
    matrix,
  }

  return { component, more }
}

function emptyGlyph(): Glyph {
  return {
    type: 'simple',
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    endPtsOfContours: [],
    instructions: [],
    points: [],
    contoursOverlap: false,
  }
}
