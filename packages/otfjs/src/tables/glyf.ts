// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { assert } from '../utils.js'
import { Reader } from '../buffer.js'

export interface Glyph {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  endPtsOfContours: number[]
  instructions: number[]
  points: Point[]
  contoursOverlap: boolean
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
    // TODO: handle composite glyphs
    return {} as any
  }

  // simple glyph

  const endPtsOfContours = view.array(numberOfContours, () => view.u16())
  const instructionLength = view.u16()
  const instructions = view.array(instructionLength, () => view.u8())

  const numEntries = endPtsOfContours[endPtsOfContours.length - 1] + 1

  const { flags, contoursOverlap } = readFlags(numEntries, view)
  const xCoordinates = readXCoordinates(flags, view)
  const yCoordinates = readYCoordinates(flags, view)
  const points = combinePoints(flags, xCoordinates, yCoordinates)

  const glyph: Glyph = {
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

function emptyGlyph(): Glyph {
  return {
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
