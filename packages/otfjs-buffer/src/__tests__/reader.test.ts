import { describe, expect, it } from 'vitest'

import { Reader } from '../reader.js'
import { asDataView } from '../utils.js'

describe('reader.ts', () => {
  describe('Reader', () => {
    it('should read u24', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0x04])
      const reader = new Reader(new Uint8Array(data.buffer))
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
        const data = new Uint8Array(2)
        asDataView(data).setUint16(0, val)
        const reader = new Reader(data)
        expect(reader.f2dot14()).toBeCloseTo(expected, 6)
      }
    })

    it('subtable without a length extends to the end of the data', () => {
      const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
      const reader = new Reader(data.subarray(2))
      const sub = reader.subtable(4)
      expect(sub.length).toBe(2)
      expect([...sub.u8Array(2)]).toEqual([6, 7])
    })

    it('nested subtables read relative to their own start', () => {
      const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
      const sub = new Reader(data.subarray(1)).subtable(2, 4).subtable(1, 2)
      expect(sub.u16()).toBe(0x0405)
      expect([...sub.data]).toEqual([4, 5])
    })

    it('stream returns the next bytes and advances past them', () => {
      const reader = new Reader(new Uint8Array([1, 2, 3, 4, 5]))
      reader.u8()
      const stream = reader.stream(2)
      expect(reader.offset).toBe(3)
      expect(stream.u16()).toBe(0x0203)
      expect(reader.u8()).toBe(4)
    })

    it('throws when reading past the end of a subtable', () => {
      const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7])
      const sub = new Reader(data).subtable(2, 3)
      expect(sub.u16()).toBe(0x0203)
      expect(() => sub.u16()).toThrow(RangeError)
      // a failed read doesn't move the offset
      expect(sub.offset).toBe(2)
      expect(sub.u8()).toBe(4)
    })

    it('throws on a subtable outside the reader', () => {
      const reader = new Reader(new Uint8Array(4))
      expect(() => reader.subtable(2, 3)).toThrow(RangeError)
      expect(() => reader.subtable(5)).toThrow(RangeError)
      expect(() => reader.u8Array(5)).toThrow(RangeError)
    })
  })
})
