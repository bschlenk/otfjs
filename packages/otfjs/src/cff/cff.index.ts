import type { Reader } from '@otfjs/buffer'

import { assert } from '../utils/utils.js'

/**
 * A CFF INDEX: an array of byte strings, like the charstring of each glyph.
 * Items are sliced out when asked for, not copied.
 */
export class CffIndex {
  readonly count: number
  // private fields, so table viewers that walk the object skip the bytes
  readonly #data: Reader
  readonly #offsets: number[]

  constructor(data: Reader, offsets: number[]) {
    this.count = offsets.length - 1
    this.#data = data
    this.#offsets = offsets
  }

  get(i: number): Uint8Array {
    assert(
      Number.isInteger(i) && i >= 0 && i < this.count,
      `CFF INDEX item ${i} is out of range; the INDEX has ${this.count}`,
    )
    const start = this.#offsets[i]
    const length = this.#offsets[i + 1] - start
    return this.#data.subtable(start, length).u8Array(length)
  }
}

/** Read an INDEX at the reader's position, leaving it just past the end. */
export function readCffIndex(view: Reader): CffIndex {
  const count = view.u16()
  if (count === 0) return new CffIndex(view.subtable(view.offset, 0), [0])

  const offSize = view.u8()
  assert(offSize >= 1 && offSize <= 4, `Invalid CFF INDEX offSize ${offSize}`)

  // Offsets count from 1, the byte before the item data
  const offsets = view.array(count + 1, () => readOffset(view, offSize) - 1)
  const data = view.subtable(view.offset, offsets[count])
  view.skip(offsets[count])

  return new CffIndex(data, offsets)
}

function readOffset(view: Reader, size: number) {
  switch (size) {
    case 1:
      return view.u8()
    case 2:
      return view.u16()
    case 3:
      return view.u24()
    default:
      return view.u32()
  }
}
