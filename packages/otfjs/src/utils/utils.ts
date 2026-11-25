export const EMPTY_U8_ARRAY: Uint8Array = new Uint8Array(0)

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

export function identity<T>(x: T): T {
  return x
}

export function sum(arr: number[]): number
export function sum<T>(arr: T[], fn: (item: T) => number): number
export function sum<T>(
  arr: T[],
  fn: (item: T) => number = identity as (item: T) => number,
): number {
  return arr.reduce((acc, item) => acc + fn(item), 0)
}

/** A value `sortBy` can compare: strings by code unit, numbers by value. */
type Sortable = string | number

/** Keys of `T` whose values are sortable. */
type SortableKeys<T> = {
  [K in keyof T]: T[K] extends Sortable ? K : never
}[keyof T]

/**
 * Sort `arr` in place and return it. Pass a key or function to sort objects
 * by one of their strings or numbers. Strings sort by code unit, which is
 * the byte order the OpenType spec uses for tags, unlike `localeCompare`.
 * Numbers sort by value, unlike the default `Array.prototype.sort`. All
 * keys should be the same type.
 */
export function sortBy<T extends Sortable>(arr: T[]): T[]
export function sortBy<T>(
  arr: T[],
  by: SortableKeys<T> | ((item: T) => Sortable),
): T[]
export function sortBy<T>(
  arr: T[],
  by?: SortableKeys<T> | ((item: T) => Sortable),
): T[] {
  const key =
    by === undefined ? (item: T) => item as Sortable
    : typeof by === 'function' ? by
    : (item: T) => item[by] as Sortable

  return arr.sort((a, b) => {
    const ka = key(a)
    const kb = key(b)
    return (
      ka < kb ? -1
      : ka > kb ? 1
      : 0
    )
  })
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
