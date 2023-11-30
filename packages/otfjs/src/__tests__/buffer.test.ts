import { describe, expect, it } from 'vitest'

import { Reader, Writer } from '../buffer.js'

describe('buffer.ts', () => {
  describe('Reader', () => {
    it('should read u24', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0x04])
      const reader = new Reader(data.buffer)
      expect(reader.u24()).toBe(0x010203)
    })

    it('should read f2dot14', () => {
      const cases = [
        [0x7fff, 1.999939],
        [0x7000, 1.75],
        [0x0001, 0.000061],
        [0x0000, 0.0],
        [0xffff, -0.000061],
        [0x8000, -2.0],
      ]

      for (const [val, expected] of cases) {
        const data = new ArrayBuffer(2)
        new DataView(data).setUint16(0, val)
        const reader = new Reader(data)
        expect(reader.f2dot14()).toBeCloseTo(expected, 6)
      }
    })
  })

  describe('Writer', () => {
    it('should write u24', () => {
      const writer = new Writer()
      writer.u24(0x010203)

      const data = new Uint8Array(writer.data)
      expect(data[0]).toBe(0x01)
      expect(data[1]).toBe(0x02)
      expect(data[2]).toBe(0x03)
      expect(data[3]).toBe(0)
    })

    it('should write f2dot14', () => {
      const cases = [
        [0x7fff, 1.999939],
        [0x7000, 1.75],
        [0x0001, 0.000061],
        [0x0000, 0.0],
        [0xffff, -0.000061],
        [0x8000, -2.0],
      ]

      for (const [expected, val] of cases) {
        const writer = new Writer()
        writer.f2dot14(val)
        expect(writer.view.getUint16(0)).toBe(expected)
      }
    })
  })
})
