const SECONDS_BETWEEN_1904_AND_1970 = 2_082_844_800n

export function toHex(n: number) {
  return `0x${n.toString(16).padStart(8, '0')}`
}

/**
 * Create an object from the given array, where the keys
 * are the result of calling `getKey` on each item.
 */
export function toObject<T>(
  arr: T[],
  getKey: (item: T) => string,
): Record<string, T> {
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

export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg)
  }
}
