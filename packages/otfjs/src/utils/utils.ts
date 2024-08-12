export const EMPTY_U8_ARRAY = new Uint8Array(0)

export function toHex(n: number, bytes = 4) {
  let h = n.toString(16)
  let neg = false
  if (h.startsWith('-')) {
    h = h.slice(1)
    neg = true
  }
  return `0x${h.padStart(bytes * 2, neg ? '1' : '0')}`
}

export function range<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i))
}

/**
 * Create an object from the given array, where the keys
 * are the result of calling `getKey` on each item.
 */
export function toObject<T>(arr: T[], getKey: (item: T) => string) {
  return arr.reduce<Record<string, T>>((acc, item) => {
    acc[getKey(item)] = item
    return acc
  }, {})
}

/**
 * Get the amount of padding required to align a value of the given length to a
 * multiple of the given alignment.
 */
export function getAlignPadding(length: number, align: number) {
  return (align - (length % align)) % align
}

export function padToMultiple(length: number, align: number) {
  return length + getAlignPadding(length, align)
}

export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg)
  }
}

export function error(msg: string): never {
  throw new Error(msg)
}

export function debug(n: number) {
  // TODO: return as all different numeric types
  return n
}

export function asDataView(
  data: ArrayBufferLike | ArrayBufferView | DataView,
  offset = 0,
  length?: number,
): DataView {
  return ArrayBuffer.isView(data) ?
      new DataView(
        data.buffer,
        data.byteOffset + offset,
        length ?? data.byteLength,
      )
    : new DataView(data, offset, length)
}

export function asUint8Array(
  data: ArrayBufferLike | ArrayBufferView | DataView,
  offset = 0,
  length?: number,
): Uint8Array {
  return ArrayBuffer.isView(data) ?
      new Uint8Array(
        data.buffer,
        data.byteOffset + offset,
        length ?? data.byteLength,
      )
    : new Uint8Array(data, offset, length)
}