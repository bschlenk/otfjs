import { describe, expect, it } from 'vitest'

import { from2dot14, from16dot16, to2dot14 } from '../bit.js'

describe('bit', () => {
  describe('to2dot14()', () => {
    const cases = [
      [1.999939, 0x7fff],
      [1.75, 0x7000],
      [0.000061, 0x0001],
      [0.0, 0x0000],
      [-0.000061, 0xffff],
      [-2.0, 0x8000],
      // Fraction rounds up to a whole number, which must carry into the
      // integer part rather than being ORed into it. The bug only shows when
      // the integer part is odd, e.g. -1 for -0.00001
      [0.99999, 0x4000],
      [-0.00001, 0x0000],
      [-1.00001, 0xc000],
      // Rounds past the max, so it must clamp instead of wrapping to -2
      [1.99999, 0x7fff],
    ]

    for (const [val, expected] of cases) {
      it(`should convert ${val} to ${hex(expected, 4)}`, () => {
        expect(to2dot14(val)).toBe(expected)
      })
    }
  })

  describe('from2dot14()', () => {
    const cases = [
      [1.999939, 0x7fff],
      [1.75, 0x7000],
      [0.000061, 0x0001],
      [0.0, 0x0000],
      [-0.000061, 0xffff],
      [-2.0, 0x8000],
    ]

    for (const [expected, val] of cases) {
      it(`should convert ${hex(val, 4)} to ${expected}`, () => {
        expect(from2dot14(val)).toBeCloseTo(expected, 6)
      })
    }

    it('should treat signed and unsigned inputs the same', () => {
      expect(from2dot14(-1)).toBe(from2dot14(0xffff))
      expect(from2dot14(-0x8000)).toBe(from2dot14(0x8000))
    })

    it('should round trip every 16 bit value', () => {
      for (let i = 0; i <= 0xffff; i++) {
        expect(to2dot14(from2dot14(i))).toBe(i)
      }
    })
  })

  describe('from16dot16()', () => {
    const cases = [
      [0, 0x00000000],
      [1, 0x00010000],
      [1.5, 0x00018000],
      [-1, 0xffff0000],
      [-0.5, 0xffff8000],
      [32767.999985, 0x7fffffff],
      [-32768, 0x80000000],
    ]

    for (const [expected, val] of cases) {
      it(`should convert ${hex(val, 8)} to ${expected}`, () => {
        expect(from16dot16(val)).toBeCloseTo(expected, 6)
      })
    }
  })
})

function hex(val: number, digits: number) {
  return `0x${val.toString(16).padStart(digits, '0')}`
}
