import { describe, expect, it } from 'vitest'

import { from26dot6, to26dot6 } from '../bit.js'
import { toHex } from '../utils.js'

describe('bit', () => {
  describe('to26dot6()', () => {
    const cases = [
      [0, 0],
      [4.125, 0b0100_001000],
      [0.015625, 0b0_000001],
      [0.5, 0b0_100000],
      [0.25, 0b0_010000],
      [1.5, 0b1_100000],
      [-1.5, 0xffffffa0],
    ]

    for (const [val, expected] of cases) {
      it(`should convert ${val} to ${toHex(expected)}`, () => {
        expect(to26dot6(val) >>> 0).toBe(expected >>> 0)
      })
    }
  })

  describe('from26dot6()', () => {
    const cases = [
      [0, 0],
      [4.125, 0b0100_001000],
      [0.015625, 0b0_000001],
      [0.5, 0b0_100000],
      [0.25, 0b0_010000],
      [1.5, 0b1_100000],
      [-1.5, 0xffffffa0],
    ]

    for (const [expected, val] of cases) {
      it(`should convert ${toHex(val)} to ${expected}`, () => {
        expect(from26dot6(val)).toBe(expected)
      })
    }
  })
})
