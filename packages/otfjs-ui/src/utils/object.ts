export function getItemOrFirst<T>(obj: Record<string, T>, key: string) {
  if (key in obj) return obj[key]

  const firstKey = getFirstKey(obj)
  if (firstKey) return obj[firstKey]

  return null
}

export function getFirstKey(obj: Record<string, any>) {
  for (const key in obj) {
    return key
  }
  return null
}

export function filterMap<T, U>(
  items: T[],
  predicate: (item: T) => boolean,
  fn: (item: T) => U,
): U[] {
  const mapped: U[] = []

  for (const item of items) {
    if (predicate(item)) {
      mapped.push(fn(item))
    }
  }

  return mapped
}
