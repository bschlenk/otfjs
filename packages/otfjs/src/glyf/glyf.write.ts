// Writing glyphs to the glyf table.
// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import * as vec from '@bschlenk/vec'
import { Writer } from '@otfjs/buffer'

import { GlyfFlags } from '../tables/glyf.gen.js'
import type { LocaTable } from '../tables/loca.js'
import type { Glyf, GlyfComposite, GlyfSimple } from '../types.js'
import { assert } from '../utils/utils.js'
import { isStoredGlyfSource, storedGlyfBytes } from './glyf.stored.js'
import { isEmptyGlyf } from './glyf.utils.js'

/**
 * Write the glyf table, also returning the loca offsets of each glyph.
 * When building a font, use this (or `compileGlyfLoca`) so loca matches
 * the glyf table it indexes into.
 *
 * Glyphs from a glyf table read from a font that were never decoded are
 * copied as they were stored.
 */
export function writeGlyfTableWithOffsets(glyphs: Iterable<Glyf>): {
  data: Uint8Array
  offsets: LocaTable
} {
  const writer = new Writer()
  const offsets: LocaTable = []

  if (isStoredGlyfSource(glyphs)) {
    for (let id = 0; id < glyphs.numGlyphs; ++id) {
      offsets.push(writer.length)
      const stored = glyphs[storedGlyfBytes](id)
      if (stored) writer.buffer(stored)
      else writeGlyf(writer, glyphs.get(id))
      writer.pad(4)
    }
  } else {
    for (const glyph of glyphs) {
      offsets.push(writer.length)
      writeGlyf(writer, glyph)
      writer.pad(4)
    }
  }

  offsets.push(writer.length)

  return { data: writer.toBuffer(), offsets }
}

export function writeGlyfTable(glyphs: Iterable<Glyf>): Uint8Array {
  return writeGlyfTableWithOffsets(glyphs).data
}

function writeGlyf(writer: Writer, glyph: Glyf) {
  if (glyph.type === 'simple') writeGlyfSimple(writer, glyph)
  else writeGlyfComposite(writer, glyph)
}

function writeGlyfSimple(writer: Writer, glyph: GlyfSimple) {
  if (isEmptyGlyf(glyph)) return

  writer.i16(glyph.endPtsOfContours.length)
  writeMinMax(writer, glyph)

  writer.array('u16', glyph.endPtsOfContours)

  writer.u16(glyph.instructions.length)
  writer.buffer(glyph.instructions)

  const flagsArray: GlyfFlags[] = []
  const xCoordinates: number[] = []
  const yCoordinates: number[] = []

  let lastPoint = vec.ZERO

  for (const [i, point] of glyph.points.entries()) {
    const flag = new GlyfFlags()
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

  const flagGroups: { flags: GlyfFlags; repeat: number }[] = []

  for (const flags of flagsArray) {
    const lastGroup = flagGroups[flagGroups.length - 1]

    // the repeat count is a single byte, so start a new run after 255
    if (lastGroup?.flags.value === flags.value && lastGroup.repeat < 255) {
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

function writeGlyfComposite(writer: Writer, glyph: GlyfComposite) {
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

function writeMinMax(writer: Writer, glyph: Glyf) {
  writer.i16(glyph.xMin)
  writer.i16(glyph.yMin)
  writer.i16(glyph.xMax)
  writer.i16(glyph.yMax)
}
