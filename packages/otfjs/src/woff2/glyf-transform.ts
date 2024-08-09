import * as vec from '@bschlenk/vec'

import { Reader } from '../buffer/reader.js'
import { readCompositeGlyphComponent } from '../glyph-utils.js'
import { emptyGlyph } from '../tables/glyf.js'
import type { Glyph, GlyphCompositeComponent, Point } from '../types.js'
import { high12, highNibble, low12, lowNibble, readBit } from '../utils/bit.js'
import { assert, EMPTY_U8_ARRAY } from '../utils/utils.js'

export function decodeGlyfTransform0(buff: Uint8Array) {
  const {
    numGlyphs,
    indexFormat,
    nContourStream,
    nPointsStream,
    flagStream,
    glyphStream,
    compositeStream,
    bboxBitmap,
    bboxStream,
    instructionStream,
    overlapSimpleBitmap,
  } = readHeader(buff)

  const readInstructions = () => instructionStream.u8Array(glyphStream.u16225())

  const readMinMax = () => ({
    xMin: bboxStream.i16(),
    yMin: bboxStream.i16(),
    xMax: bboxStream.i16(),
    yMax: bboxStream.i16(),
  })

  const glyphs: Glyph[] = []

  for (let i = 0; i < numGlyphs; i++) {
    const numContours = nContourStream.i16()
    const hasBBox = readBit(bboxBitmap, i)

    switch (numContours) {
      case 0: {
        // empty glyph

        assert(!hasBBox, 'Empty glyph should not have explicit bbox')
        glyphs.push(emptyGlyph())
        break
      }

      case -1: {
        // composite glyph

        assert(hasBBox, 'Composite glyph must have explicit bbox')

        const components: GlyphCompositeComponent[] = []
        let component!: GlyphCompositeComponent
        let weHaveInstructions = false

        do {
          component = readCompositeGlyphComponent(compositeStream)
          components.push(component)
          weHaveInstructions ||= component.flags.weHaveInstructions
        } while (component.flags.moreComponents)

        const instructions =
          weHaveInstructions ? readInstructions() : EMPTY_U8_ARRAY

        const minMax = readMinMax()

        glyphs.push({ type: 'composite', ...minMax, components, instructions })

        break
      }

      default: {
        // simple glyph

        const contourPoints = nPointsStream.array(numContours, (v) =>
          v.u16225(),
        )

        const { endPtsOfContours, nPoints } = computePointMetrics(contourPoints)
        const flags = flagStream.u8Array(nPoints)

        const points: Point[] = []
        let lastPoint = vec.ZERO
        let xMin = Infinity
        let yMin = Infinity
        let xMax = -Infinity
        let yMax = -Infinity

        for (let j = 0; j < nPoints; j++) {
          const flag = flags[j]
          const point = readPoint(flag, glyphStream)
          points.push(point)

          if (!hasBBox) {
            lastPoint = vec.add(lastPoint, point)
            xMin = Math.min(xMin, lastPoint.x)
            yMin = Math.min(yMin, lastPoint.y)
            xMax = Math.max(xMax, lastPoint.x)
            yMax = Math.max(yMax, lastPoint.y)
          }
        }

        if (hasBBox) {
          ;({ xMin, yMin, xMax, yMax } = readMinMax())
        }

        const instructions = readInstructions()

        const contoursOverlap =
          overlapSimpleBitmap == null || readBit(overlapSimpleBitmap, i)

        glyphs.push({
          type: 'simple',
          xMin,
          yMin,
          xMax,
          yMax,
          endPtsOfContours,
          instructions,
          points,
          contoursOverlap,
        })

        break
      }
    }
  }

  return { glyphs, indexFormat }
}

function readHeader(buff: Uint8Array) {
  const view = new Reader(buff)

  view.skip(2) // reserved

  const optionFlags = view.u16()
  const numGlyphs = view.u16()

  const indexFormat = view.u16() as 0 | 1
  assert(
    indexFormat === 0 || indexFormat === 1,
    `Invalid index format ${indexFormat}`,
  )

  const nContourStreamSize = view.u32()
  const nPointsStreamSize = view.u32()
  const flagStreamSize = view.u32()
  const glyphStreamSize = view.u32()
  const compositeStreamSize = view.u32()
  const bboxStreamSize = view.u32()
  const instructionStreamSize = view.u32()

  const nContourStream = view.stream(nContourStreamSize)
  const nPointsStream = view.stream(nPointsStreamSize)
  const flagStream = view.stream(flagStreamSize)
  const glyphStream = view.stream(glyphStreamSize)
  const compositeStream = view.stream(compositeStreamSize)
  const bboxBitmap = view.u8Array(numGlyphs)
  const bboxStream = view.stream(bboxStreamSize)
  const instructionStream = view.stream(instructionStreamSize)

  const overlapSimpleBitmap = optionFlags & 1 ? view.u8Array(numGlyphs) : null

  return {
    numGlyphs,
    indexFormat,
    nContourStream,
    nPointsStream,
    flagStream,
    glyphStream,
    compositeStream,
    bboxBitmap,
    bboxStream,
    instructionStream,
    overlapSimpleBitmap,
  }
}

function computePointMetrics(contourPoints: number[]) {
  const endPtsOfContours: number[] = []
  let sum = 0

  for (const points of contourPoints) {
    sum += points
    endPtsOfContours.push(sum - 1)
  }

  return { endPtsOfContours, nPoints: sum }
}

function readPoint(flag: number, view: Reader) {
  const onCurve = !((flag >>> 7) & 1)
  const low = flag & 127

  let x = 0
  let y = 0
  let deltaX = 0
  let deltaY = 0
  let yNeg = false
  let xNeg = false

  if (low >= 20) {
    xNeg = (low & 1) === 0
    yNeg = ((low >>> 1) & 1) === 0
  }

  if (low < 10) {
    y = view.u8()
    deltaY = 256 * (low >>> 1)
    yNeg = (low & 1) === 0
  } else if (low < 20) {
    x = view.u8()
    deltaX = 256 * ((low >>> 1) - 5)
    xNeg = (low & 1) === 0
  } else if (low < 36) {
    const byte = view.u8()
    x = highNibble(byte)
    y = lowNibble(byte)
    deltaX = 1
    deltaY = 1 + ((low >>> 2) - 5) * 16
  } else if (low < 52) {
    const byte = view.u8()
    x = highNibble(byte)
    y = lowNibble(byte)
    deltaX = 17
    deltaY = 1 + ((low >>> 2) - 9) * 16
  } else if (low < 68) {
    const byte = view.u8()
    x = highNibble(byte)
    y = lowNibble(byte)
    deltaX = 33
    deltaY = 1 + ((low >>> 2) - 13) * 16
  } else if (low < 84) {
    const byte = view.u8()
    x = highNibble(byte)
    y = lowNibble(byte)
    deltaX = 49
    deltaY = 1 + ((low >>> 2) - 17) * 16
  } else if (low < 96) {
    x = view.u8()
    y = view.u8()
    deltaX = 1
    deltaY = 1 + ((low >>> 2) - 21) * 256
  } else if (low < 108) {
    x = view.u8()
    y = view.u8()
    deltaX = 257
    deltaY = 1 + ((low >>> 2) - 24) * 256
  } else if (low < 120) {
    x = view.u8()
    y = view.u8()
    deltaX = 513
    deltaY = 1 + ((low >>> 2) - 27) * 256
  } else if (low < 124) {
    const byte = view.u24()
    x = high12(byte)
    y = low12(byte)
  } else {
    x = view.u16()
    y = view.u16()
  }

  x = (x + deltaX) * (xNeg ? -1 : 1)
  y = (y + deltaY) * (yNeg ? -1 : 1)

  return { x, y, onCurve }
}
