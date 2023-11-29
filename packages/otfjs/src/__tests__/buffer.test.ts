import { describe, expect, it } from 'vitest'

import { Reader, Writer } from '../buffer.js'

describe('buffer.ts', () => {
  describe('Reader', () => {
    it('should read u24', () => {
      const data = new Uint8Array([0x01, 0x02, 0x03, 0x04])
      const reader = new Reader(data.buffer)
      expect(reader.u24()).toBe(0x010203)
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
  })
})
