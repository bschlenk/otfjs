/**
 * The index of the first item in `items`, sorted by `key`, whose key is at
 * least `target`, or `items.length` if there is none.
 */
export function lowerBound<T>(
  items: T[],
  target: number,
  key: (item: T) => number,
): number {
  let lo = 0
  let hi = items.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (key(items[mid]) < target) lo = mid + 1
    else hi = mid
  }
  return lo
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
    const item = arr[mid]
    const value = fn(item)

    if (value < target) {
      start = mid + 1
    } else if (value > target) {
      end = mid - 1
    } else {
      return item
    }
  }

  return null
}
