import * as vec from '@bschlenk/vec'

import { Writer } from '../buffer/writer.js'
import { GlyphFlags, glyphFlags } from '../glyph-utils.js'
import type { Glyph, GlyphComposite, GlyphSimple } from '../types.js'
import { assert } from '../utils/utils.js'

export function writeGlyfTable(glyphs: Glyph[], loca: number[]) {
  const writer = new Writer()

  for (let i = 0; i < glyphs.length; i++) {
    const glyph = glyphs[i]

    loca.push(writer.length)

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

  loca.push(writer.length)

  return writer
}

function writeSimpleGlyph(writer: Writer, glyph: GlyphSimple) {
  writer.i16(glyph.endPtsOfContours.length)
  writeMinMax(writer, glyph)

  for (const endPt of glyph.endPtsOfContours) {
    writer.u16(endPt)
  }

  writer.u16(glyph.instructions.length)
  writer.buffer(glyph.instructions)

  const flagsArray: GlyphFlags[] = []
  const xCoordinates: number[] = []
  const yCoordinates: number[] = []

  let lastPoint = vec.ZERO

  for (const point of glyph.points) {
    const flag = glyphFlags(0)
    flag.onCurvePoint = point.onCurve
    flag.contoursOverlap = glyph.contoursOverlap

    const { x, y } = vec.subtract(point, lastPoint)

    if (lastPoint.x === point.x) {
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

    if (lastPoint.y === point.y) {
      flag.yIsSameOrPositiveYShortVector = true
    } else {
      const smallY = Math.abs(y)
      if (smallY < 256) {
        flag.yShortVector = true
        flag.yIsSameOrPositiveYShortVector = y >= 0
        yCoordinates.push(smallY)
      } else {
        yCoordinates.push(x)
      }
    }

    flagsArray.push(flag)

    lastPoint = point
  }

  const flagGroups: { flags: GlyphFlags; repeat: number }[] = []

  for (const flags of flagsArray) {
    const lastGroup = flagGroups[flagGroups.length - 1]

    if (lastGroup && lastGroup.flags.value === flags.value) {
      lastGroup.flags.repeat = true
      lastGroup.repeat++
    } else {
      flagGroups.push({ flags, repeat: 0 })
    }
  }

  for (const { flags, repeat } of flagGroups) {
    writer.u8(flags.value)
    if (repeat) {
      writer.u8(repeat)
    }
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

  for (const { flags, glyphIndex, arg1, arg2, extra } of glyph.components) {
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
    }
  }
}

function writeMinMax(writer: Writer, glyph: Glyph) {
  writer.i16(glyph.xMin)
  writer.i16(glyph.yMin)
  writer.i16(glyph.xMax)
  writer.i16(glyph.yMax)
}
