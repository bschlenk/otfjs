import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { readCffDict, TOP_DICT_OPERATORS } from '../cff/cff.dict.js'
import { cffTable, charString } from '../cff/cff-test-utils.js'
import { getGlyph } from '../fns/get-glyph.js'
import { Font } from '../font.js'
import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import { headTable, hheaTable, hmtxTable, maxpTable } from '../test-utils.js'
import { readCffTable } from './cff.js'

// A square drawn by a local subroutine, after a width of 200 + nominal
const square = charString(200, 100, 0, 'rmoveto', -107, 'callsubr', 'endchar')
const squareSubr = charString(400, 0, 0, 400, -400, 0, 'rlineto', 'return')

describe('readCffTable', () => {
  it('reads the INDEXes and Private DICT', () => {
    const cff = readCffTable(
      new Reader(
        cffTable({
          charStrings: [charString('endchar'), square],
          private: {
            subrs: [squareSubr],
            defaultWidthX: 500,
            nominalWidthX: 300,
          },
        }),
      ),
    )

    expect(cff.names).toEqual(['Test'])
    expect(cff.charStrings.count).toBe(2)
    expect(cff.charStrings.get(1)).toEqual(square)
    expect(cff.globalSubrs.count).toBe(0)
    expect(cff.fdSelect).toBeNull()
    expect(cff.privateDicts).toHaveLength(1)
    expect(cff.privateDicts[0]).toMatchObject({
      defaultWidthX: 500,
      nominalWidthX: 300,
    })
    expect(cff.privateDicts[0].subrs?.get(0)).toEqual(squareSubr)
  })

  it('reads the Font DICTs and FDSelect of CID-keyed fonts', () => {
    const cff = readCffTable(
      new Reader(
        cffTable({
          charStrings: [charString('endchar'), square, square],
          fds: [
            { nominalWidthX: 1 },
            { nominalWidthX: 2, subrs: [squareSubr] },
          ],
          fdSelect: [0, 1, 1],
        }),
      ),
    )

    expect(cff.topDict.ROS).toEqual([391, 392, 0])
    expect(Array.from(cff.fdSelect!)).toEqual([0, 1, 1])
    expect(cff.privateDicts.map((p) => p.nominalWidthX)).toEqual([1, 2])
    expect(cff.privateDicts[0].subrs).toBeNull()
  })
})

describe('readCffDict', () => {
  it('reads negative two-byte operands and real numbers', () => {
    // -108, -1131, 1E-3 and -2.5, then FontMatrix
    const bytes = [
      251, 0, 254, 255, 30, 0x1c, 0x3f, 30, 0xe2, 0xa5, 0xff, 12, 7,
    ]
    const dict = readCffDict(
      new Reader(new Uint8Array(bytes)),
      TOP_DICT_OPERATORS,
    )
    expect(dict).toEqual({ FontMatrix: [-108, -1131, 0.001, -2.5] })
  })

  it('keeps unknown operators by number', () => {
    const dict = readCffDict(new Reader(new Uint8Array([139, 12, 99])), {})
    expect(dict).toEqual({ op1299: [0] })
  })
})

describe('getGlyph with CFF outlines', () => {
  it('runs the charstring and takes the advance from hmtx', () => {
    const font = cffFont({
      charStrings: [charString('endchar'), square],
      private: { subrs: [squareSubr] },
    })

    const glyph = getGlyph(font, 1)
    expect(glyph).toMatchObject({
      type: 'cff',
      id: 1,
      advanceWidth: 600,
      xMin: 100,
      yMin: 0,
      xMax: 500,
      yMax: 400,
    })
    if (glyph.type !== 'cff') throw new Error('expected a CFF glyph')
    expect(glyph.commands.map((c) => c.type)).toEqual([
      'moveTo',
      'lineTo',
      'lineTo',
      'lineTo',
      'closePath',
    ])
  })

  it('bounds curves by how far they reach, not their control points', () => {
    const font = cffFont({
      // a curve from (0, 0) to (100, 0) through control points at y = 100
      charStrings: [
        charString(0, 0, 'rmoveto', 0, 100, 100, 0, 0, -100, 'rrcurveto'),
      ],
      private: {},
    })
    expect(getGlyph(font, 0)).toMatchObject({
      xMin: 0,
      xMax: 100,
      yMin: 0,
      yMax: 75,
    })
  })

  it('gives empty glyphs zero bounds', () => {
    const font = cffFont({ charStrings: [charString('endchar')], private: {} })
    expect(getGlyph(font, 0)).toMatchObject({
      commands: [],
      xMin: 0,
      yMin: 0,
      xMax: 0,
      yMax: 0,
    })
  })

  it('uses each glyph’s own Private DICT in CID-keyed fonts', () => {
    const offset = charString(200, 'hmoveto', -107, 'callsubr', 'endchar')
    const font = cffFont({
      charStrings: [offset, offset],
      fds: [
        { subrs: [charString(10, 0, 'rlineto', 'return')] },
        { subrs: [charString(0, 10, 'rlineto', 'return')] },
      ],
      fdSelect: [0, 1],
    })

    const ends = [0, 1].map((id) => {
      const glyph = getGlyph(font, id)
      if (glyph.type !== 'cff') throw new Error('expected a CFF glyph')
      return glyph.commands[1]
    })
    expect(ends).toEqual([
      { type: 'lineTo', x: 210, y: 0 },
      { type: 'lineTo', x: 200, y: 10 },
    ])
  })

  it('is what Font.getTable reads', () => {
    const data = cffFontData({
      charStrings: [charString('endchar')],
      private: {},
    })
    expect(new Font(data).getTable('CFF ').charStrings.count).toBe(1)
  })
})

function cffFont(props: Parameters<typeof cffTable>[0]) {
  return new FontHandle(cffFontData(props))
}

/** An OpenType font with CFF outlines, every glyph 600 wide. */
function cffFontData(props: Parameters<typeof cffTable>[0]) {
  const numGlyphs = props.charStrings.length
  return buildFont({
    tables: {
      'CFF ': cffTable(props),
      head: headTable(0),
      hhea: hheaTable(1),
      hmtx: hmtxTable(numGlyphs, 600),
      maxp: maxpTable(numGlyphs),
    },
  })
}
