const SECONDS_BETWEEN_1904_AND_1970 = 2_082_844_800n

export function toHex(n: number, bytes = 4) {
  return `0x${n.toString(16).padStart(bytes * 2, '0')}`
}

export function range<T>(n: number, fn: (i: number) => T): T[] {
  const arr = new Array<T>(n)
  for (let i = 0; i < n; ++i) {
    arr[i] = fn(i)
  }
  return arr
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
