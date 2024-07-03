// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import * as mat from '@bschlenk/mat'

import { Reader } from '../buffer.js'
import { createFlagReader } from '../flags.js'
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
  instructions: Uint8Array
  points: Point[]
  contoursOverlap: boolean
}

export interface GlyphComposite extends GlyphBase<'composite'> {
  components: GlyphCompositeComponent[]
}

export type Glyph = GlyphSimple | GlyphComposite

interface GlyphCompositeComponent {
  flags: ReturnType<typeof newCompositeFlag>
  glyphIndex: number
  arg1: number
  arg2: number
  matrix: mat.Matrix
}

export interface Point {
  x: number
  y: number
  onCurve: boolean
}

const newFlag = createFlagReader({
  onCurvePoint: 0,
  xShortVector: 1,
  yShortVector: 2,
  repeat: 3,
  xIsSameOrPositiveXShortVector: 4,
  yIsSameOrPositiveYShortVector: 5,
  contoursOverlap: 6,
})

type Flag = ReturnType<typeof newFlag>

const newCompositeFlag = createFlagReader({
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

/**
 * This reader is a special case, where the `view` is expected to already
 * incorporate the offset into the glyph table to the desired glyph. The glyph
 * offset can be determined by reading the `loca` table. The glyph length can be
 * determined by looking at glyphIndex + 1.
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
  const instructions = view.u8Array(instructionLength)

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
  const flags: Flag[] = []
  while (flags.length < count) {
    const flag = newFlag(view.u8())
    flags.push(flag)

    if (flag.repeat) {
      const count = view.u8()
      for (let i = 0; i < count; ++i) {
        flags.push(flag)
      }
    }
  }

  const contoursOverlap = flags[0]?.contoursOverlap ?? false

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
  let component!: GlyphCompositeComponent

  do {
    component = readCompositeGlyphComponent(view)
    components.push(component)
  } while (component.flags.moreComponents)

  return components
}

function readCompositeGlyphComponent(view: Reader) {
  const flags = newCompositeFlag(view.u16())
  const glyphIndex = view.u16()

  const xAndYAreScaled =
    flags.scaledComponentOffset && !flags.unscaledComponentOffset

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

  const component: GlyphCompositeComponent = {
    flags,
    glyphIndex,
    arg1,
    arg2,
    matrix,
  }

  return component
}

export function emptyGlyph(): GlyphSimple {
  return {
    type: 'simple',
    xMin: 0,
    yMin: 0,
    xMax: 0,
    yMax: 0,
    endPtsOfContours: [],
    instructions: new Uint8Array(0),
    points: [],
    contoursOverlap: false,
  }
}
