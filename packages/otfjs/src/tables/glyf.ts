// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import type { Reader } from '../buffer/reader.js'
import {
  type GlyphFlags,
  glyphFlags,
  readCompositeGlyphComponent,
} from '../glyph-utils.js'
import type {
  Glyph,
  GlyphComposite,
  GlyphCompositeComponent,
  GlyphSimple,
  Point,
} from '../types.js'
import { assert, EMPTY_U8_ARRAY } from '../utils/utils.js'

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
    const parts = readCompositeGlyph(view)
    const glyph: GlyphComposite = {
      type: 'composite',
      xMin,
      yMin,
      xMax,
      yMax,
      ...parts,
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
  const flags: GlyphFlags[] = []
  while (flags.length < count) {
    const flag = glyphFlags(view.u8())
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

function readXCoordinates(flags: GlyphFlags[], view: Reader) {
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

function readYCoordinates(flags: GlyphFlags[], view: Reader) {
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
  flags: GlyphFlags[],
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
  let weHaveInstructions = false

  do {
    component = readCompositeGlyphComponent(view)
    components.push(component)
    weHaveInstructions ||= component.flags.weHaveInstructions
  } while (component.flags.moreComponents)

  let instructions = EMPTY_U8_ARRAY
  if (weHaveInstructions) {
    const instructionLength = view.u16()
    instructions = view.u8Array(instructionLength)
  }

  return { components, instructions }
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
