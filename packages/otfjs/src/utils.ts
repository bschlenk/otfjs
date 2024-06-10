const SECONDS_BETWEEN_1904_AND_1970 = 2_082_844_800n

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

export function fromLongDateTime(val: bigint) {
  const epochTimestamp = Number(val - SECONDS_BETWEEN_1904_AND_1970)
  return new Date(epochTimestamp * 1000)
}

export function toLongDateTime(val: Date) {
  const epochTimestamp = Math.round(val.getTime() / 1000)
  return BigInt(epochTimestamp) + SECONDS_BETWEEN_1904_AND_1970
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

export function debug(n: number) {
  // TODO: return as all different numeric types
  return n
}

export function areClose(a: number, b: number, e = Number.EPSILON) {
  return Math.abs(a - b) <= e
}

export function binarySearch(arr: number[], target: number): number | null
export function binarySearch<T>(
  arr: T[],
  target: number,
  fn: (item: T) => number,
): T | null
export function binarySearch<T>(
  arr: T[],
  target: number,
  fn: (item: T) => number = (x) => x as number,
): T | null {
  let start = 0
  let end = arr.length - 1

  while (start <= end) {
    const mid = (start + end) >>> 1
    const value = fn(arr[mid])

    if (value < target) {
      start = mid + 1
    } else if (value > target) {
      end = mid - 1
    } else {
      return arr[mid]
    }
  }

  return null
}
