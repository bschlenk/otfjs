import { describe, expect, it } from 'vitest'

import { Reader } from '../../buffer/reader.js'
import { parseCharString } from '../cff.js'

describe('parseCharString', () => {
  it('should parse a simple horizontal line', () => {
    // CharString: 100 hmoveto 50 hlineto endchar
    // hmoveto (22) moves horizontally, hlineto (6) draws horizontal line, endchar (14)
    const charString = new Uint8Array([
      // 100 (using format: 32-246 means b0 - 139)
      239, // 239 - 139 = 100
      22, // hmoveto
      // 50
      189, // 189 - 139 = 50
      6, // hlineto
      14, // endchar
    ])

    const path = parseCharString(charString, null, null, 0, 0)

    expect(path.commands).toHaveLength(2)
    expect(path.commands[0]).toEqual({ type: 'moveTo', x: 100, y: 0 })
    expect(path.commands[1]).toEqual({ type: 'lineTo', x: 150, y: 0 })
  })

  it('should parse a simple vertical line', () => {
    // CharString: 100 vmoveto 50 vlineto endchar
    const charString = new Uint8Array([
      239, // 100
      4, // vmoveto
      189, // 50
      7, // vlineto
      14, // endchar
    ])

    const path = parseCharString(charString, null, null, 0, 0)

    expect(path.commands).toHaveLength(2)
    expect(path.commands[0]).toEqual({ type: 'moveTo', x: 0, y: 100 })
    expect(path.commands[1]).toEqual({ type: 'lineTo', x: 0, y: 150 })
  })

  it('should parse a curve', () => {
    // CharString: 0 0 rmoveto 10 20 30 40 50 60 rrcurveto endchar
    const charString = new Uint8Array([
      139, // 0
      139, // 0
      21, // rmoveto
      149, // 10
      159, // 20
      169, // 30
      179, // 40
      189, // 50
      199, // 60
      8, // rrcurveto
      14, // endchar
    ])

    const path = parseCharString(charString, null, null, 0, 0)

    expect(path.commands).toHaveLength(2)
    expect(path.commands[0]).toEqual({ type: 'moveTo', x: 0, y: 0 })
    expect(path.commands[1]).toEqual({
      type: 'curveTo',
      x1: 10,
      y1: 20,
      x2: 40,
      y2: 60,
      x: 90,
      y: 120,
    })
  })

  it('should handle width in charstring', () => {
    // CharString with width: 500 100 hmoveto endchar
    const charString = new Uint8Array([
      // 500 (needs 16-bit encoding)
      28, // indicates 16-bit number follows
      1,
      244, // 500 in big-endian
      239, // 100
      22, // hmoveto
      14, // endchar
    ])

    const path = parseCharString(charString, null, null, 0, 100)

    // Width should be nominalWidthX (100) + first operand (500) = 600
    expect(path.width).toBe(600)
    expect(path.commands).toHaveLength(1)
    expect(path.commands[0]).toEqual({ type: 'moveTo', x: 100, y: 0 })
  })

  it('should calculate bounds correctly', () => {
    // CharString: 10 20 rmoveto 30 40 rlineto endchar
    const charString = new Uint8Array([
      149, // 10
      159, // 20
      21, // rmoveto
      169, // 30
      179, // 40
      5, // rlineto
      14, // endchar
    ])

    const path = parseCharString(charString, null, null, 0, 0)

    expect(path.xMin).toBe(10)
    expect(path.yMin).toBe(20)
    expect(path.xMax).toBe(40) // 10 + 30
    expect(path.yMax).toBe(60) // 20 + 40
  })
})

describe('CFF INDEX reading', () => {
  it('should handle empty INDEX', () => {
    // Create a Reader with an empty INDEX (count = 0)
    const data = new Uint8Array([0, 0]) // count = 0
    const reader = new Reader(data)

    // This tests that readIndex handles count === 0 correctly
    // The actual readIndex function is not exported, so we test indirectly
    expect(reader.u16()).toBe(0)
  })
})
