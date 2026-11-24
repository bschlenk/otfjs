// Reading a single glyph from the glyf table.
// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import type { Reader } from '@otfjs/buffer'

import { GlyphFlags, readGlyphCompositeFlags } from '../tables/glyf.gen.js'
import type {
  Glyph,
  GlyphComposite,
  GlyphCompositeComponent,
  GlyphSimple,
  Point,
} from '../types.js'
import { assert, EMPTY_U8_ARRAY } from '../utils/utils.js'
import { emptyGlyph } from './glyph.utils.js'

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

  const endPtsOfContours = new Array<number>(numberOfContours)
  for (let i = 0; i < numberOfContours; ++i) endPtsOfContours[i] = view.u16()

  const instructionLength = view.u16()
  const instructions = view.u8Array(instructionLength)

  let points: Point[] = []
  let contoursOverlap = false

  if (numberOfContours > 0) {
    const numPoints = endPtsOfContours[numberOfContours - 1] + 1
    const flags = readFlags(numPoints, view)
    contoursOverlap = new GlyphFlags(flags[0]).contoursOverlap
    points = readPoints(flags, view)
  }

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

export function readCompositeGlyphComponent(
  view: Reader,
): GlyphCompositeComponent {
  const flags = readGlyphCompositeFlags(view)
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

/**
 * The raw flag bytes, one per point, with repeats expanded. They're kept
 * as bytes rather than `GlyphFlags` objects to avoid an allocation per
 * point; wrap one in a `GlyphFlags` to read it.
 */
function readFlags(count: number, view: Reader) {
  const flags = new Uint8Array(count)
  const flag = new GlyphFlags()

  for (let i = 0; i < count;) {
    flag.value = flags[i++] = view.u8()

    if (flag.repeat) {
      const end = Math.min(count, i + view.u8())
      flags.fill(flag.value, i, end)
      i = end
    }
  }

  return flags
}

/**
 * Read the x then y coordinate deltas, accumulating them into absolute
 * points.
 */
function readPoints(flags: Uint8Array, view: Reader) {
  const count = flags.length
  const points = new Array<Point>(count)
  const flag = new GlyphFlags()

  let x = 0
  for (let i = 0; i < count; ++i) {
    flag.value = flags[i]

    if (flag.xShortVector) {
      const dx = view.u8()
      x += flag.xIsSameOrPositiveXShortVector ? dx : -dx
    } else if (!flag.xIsSameOrPositiveXShortVector) {
      x += view.i16()
    }

    points[i] = { x, y: 0, onCurve: flag.onCurvePoint }
  }

  let y = 0
  for (let i = 0; i < count; ++i) {
    flag.value = flags[i]

    if (flag.yShortVector) {
      const dy = view.u8()
      y += flag.yIsSameOrPositiveYShortVector ? dy : -dy
    } else if (!flag.yIsSameOrPositiveYShortVector) {
      y += view.i16()
    }

    points[i].y = y
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
