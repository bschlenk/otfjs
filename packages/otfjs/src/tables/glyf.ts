// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import * as vec from '@bschlenk/vec'
import { type Reader, Writer } from '@otfjs/buffer'

import {
  type GlyphFlags,
  glyphFlags,
  readCompositeGlyphComponent,
} from '../glyph-utils.js'
import type { TableWriter } from '../table-writer.js'
import type {
  Glyph,
  GlyphComposite,
  GlyphCompositeComponent,
  GlyphSimple,
  Point,
} from '../types.js'
import { assert, EMPTY_U8_ARRAY } from '../utils/utils.js'
import type { LocaTable } from './loca.js'

/**
 * Every glyph in the font, in glyph id order, with composite glyphs left
 * as references to their components. This is what the glyf writers take.
 *
 * There's no glyf table reader yet: read glyphs one at a time with
 * `getGlyph`. A lazy, cached reader is planned.
 */
export type GlyfTable = Glyph[]

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

  let points: Point[] = []
  let contoursOverlap = false

  if (numberOfContours > 0) {
    const numEntries = endPtsOfContours[endPtsOfContours.length - 1] + 1

    const result = readFlags(numEntries, view)
    contoursOverlap = result.contoursOverlap

    const flags = result.flags
    const xCoordinates = readXCoordinates(flags, view)
    const yCoordinates = readYCoordinates(flags, view)
    points = combinePoints(flags, xCoordinates, yCoordinates)
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

/**
 * Write the glyf table, also returning the loca offsets of each glyph.
 * When building a font, use this (or `compileGlyfLoca`) so loca matches
 * the glyf table it indexes into.
 */
export function writeGlyfTableWithOffsets(glyphs: GlyfTable): {
  data: Uint8Array
  offsets: LocaTable
} {
  const writer = new Writer()
  const offsets: LocaTable = []

  for (const glyph of glyphs) {
    offsets.push(writer.length)

    switch (glyph.type) {
      case 'simple':
        writeSimpleGlyph(writer, glyph)
        break
      case 'composite':
        writeCompositeGlyph(writer, glyph)
        break
    }

    writer.pad(4)
  }

  offsets.push(writer.length)

  return { data: writer.toBuffer(), offsets }
}

export function writeGlyfTable(glyphs: GlyfTable): Uint8Array {
  return writeGlyfTableWithOffsets(glyphs).data
}

/** Read glyphs with `getGlyph`, which uses `FontHandle.getTableView(GlyfTag)`. */
export const GlyfTag = 'glyf'

/**
 * Writes only the glyf table; loca must be rebuilt to match. See
 * `compileGlyfLoca`.
 */
export const GlyfTableWriter: TableWriter<GlyfTable> = {
  tag: GlyfTag,
  write: writeGlyfTable,
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

function writeSimpleGlyph(writer: Writer, glyph: GlyphSimple) {
  // empty glyphs take no space; see isEmptyGlyph
  if (isEmptyGlyph(glyph)) return

  writer.i16(glyph.endPtsOfContours.length)
  writeMinMax(writer, glyph)

  writer.array('u16', glyph.endPtsOfContours)

  writer.u16(glyph.instructions.length)
  writer.buffer(glyph.instructions)

  const flagsArray: GlyphFlags[] = []
  const xCoordinates: number[] = []
  const yCoordinates: number[] = []

  let lastPoint = vec.ZERO

  for (const [i, point] of glyph.points.entries()) {
    const flag = glyphFlags(0)
    flag.onCurvePoint = point.onCurve
    // The spec says OVERLAP_SIMPLE should only be set on the first flag
    flag.contoursOverlap = i === 0 && glyph.contoursOverlap

    const { x, y } = vec.subtract(point, lastPoint)

    if (x === 0) {
      flag.xIsSameOrPositiveXShortVector = true
    } else {
      const smallX = Math.abs(x)
      if (smallX < 256) {
        flag.xShortVector = true
        flag.xIsSameOrPositiveXShortVector = x >= 0
        xCoordinates.push(smallX)
      } else {
        xCoordinates.push(x)
      }
    }

    if (y === 0) {
      flag.yIsSameOrPositiveYShortVector = true
    } else {
      const smallY = Math.abs(y)
      if (smallY < 256) {
        flag.yShortVector = true
        flag.yIsSameOrPositiveYShortVector = y >= 0
        yCoordinates.push(smallY)
      } else {
        yCoordinates.push(y)
      }
    }

    flagsArray.push(flag)

    lastPoint = point
  }

  const flagGroups: { flags: GlyphFlags; repeat: number }[] = []

  for (const flags of flagsArray) {
    const lastGroup = flagGroups[flagGroups.length - 1]

    if (lastGroup?.flags.value === flags.value) {
      lastGroup.repeat++
    } else {
      flagGroups.push({ flags, repeat: 0 })
    }
  }

  for (const { flags, repeat } of flagGroups) {
    if (repeat) flags.repeat = true
    writer.u8(flags.value)
    if (repeat) writer.u8(repeat)
  }

  const writeCoord = (val: number) => {
    if (val < 0 || val > 255) {
      writer.i16(val)
    } else {
      writer.u8(val)
    }
  }

  xCoordinates.forEach(writeCoord)
  yCoordinates.forEach(writeCoord)
}

function writeCompositeGlyph(writer: Writer, glyph: GlyphComposite) {
  writer.i16(-1)
  writeMinMax(writer, glyph)

  let weHaveInstructions = false

  for (const { flags, glyphIndex, arg1, arg2, extra } of glyph.components) {
    weHaveInstructions ||= flags.weHaveInstructions

    writer.u16(flags.value)
    writer.u16(glyphIndex)

    // types vary based on flags
    if (flags.arg1And2AreWords) {
      if (flags.argsAreXYValues) {
        writer.i16(arg1)
        writer.i16(arg2)
      } else {
        writer.u16(arg1)
        writer.u16(arg2)
      }
    } else {
      if (flags.argsAreXYValues) {
        writer.i8(arg1)
        writer.i8(arg2)
      } else {
        writer.u8(arg1)
        writer.u8(arg2)
      }
    }

    if (flags.weHaveAScale) {
      assert(extra.length === 1, 'Invalid extra array for weHaveAScale')
      writer.f2dot14(extra[0])
    } else if (flags.weHaveAnXAndYScale) {
      assert(extra.length === 2, 'Invalid extra array for weHaveAnXAndYScale')
      writer.f2dot14(extra[0])
      writer.f2dot14(extra[1])
    } else if (flags.weHaveATwoByTwo) {
      assert(extra.length === 4, 'Invalid extra array for weHaveATwoByTwo')
      writer.f2dot14(extra[0])
      writer.f2dot14(extra[1])
      writer.f2dot14(extra[2])
      writer.f2dot14(extra[3])
    } else {
      assert(extra.length === 0, 'Extra array should be empty')
    }
  }

  if (weHaveInstructions) {
    writer.u16(glyph.instructions.length)
    writer.buffer(glyph.instructions)
  } else {
    assert(
      glyph.instructions.length === 0,
      'Composite glyph has instructions but no component sets weHaveInstructions',
    )
  }
}

function writeMinMax(writer: Writer, glyph: Glyph) {
  writer.i16(glyph.xMin)
  writer.i16(glyph.yMin)
  writer.i16(glyph.xMax)
  writer.i16(glyph.yMax)
}
