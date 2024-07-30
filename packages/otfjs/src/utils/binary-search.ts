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
