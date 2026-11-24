import { describe, expect, it } from 'vitest'

import { computeChecksum } from '../utils.js'

describe('computeChecksum', () => {
  it('sums big-endian u32s, zero-padding the final partial word', () => {
    const data = new Uint8Array([0, 0, 0, 1, 0, 0, 0, 2, 3])
    expect(computeChecksum(data)).toBe(1 + 2 + 0x03000000)
  })

  it('reads the final partial word relative to a subarray', () => {
    const backing = new Uint8Array([9, 9, 9, 9, 0, 0, 0, 1, 3])
    expect(computeChecksum(backing.subarray(4))).toBe(1 + 0x03000000)
  })
})
