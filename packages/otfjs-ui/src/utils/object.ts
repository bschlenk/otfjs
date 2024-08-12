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

export function filterMap<T, R>(
  items: T[],
  predicate: (item: T) => boolean,
  fn: (item: T) => R,
): R[] {
  const mapped: R[] = []
  const n = items.length

  for (let i = 0; i < n; ++i) {
    const item = items[i]

    if (predicate(item)) {
      mapped.push(fn(item))
    }
  }

  return mapped
}

export function entriesFilterMap<K extends string | number, V, R>(
  items: Record<K, V>,
  predicate: (key: K, value: V) => boolean,
  fn: (key: K, value: V) => R,
): R[] {
  const mapped: R[] = []

  for (const entry of Object.entries(items) as [K, V][]) {
    if (predicate(...entry)) {
      mapped.push(fn(...entry))
    }
  }

  return mapped
}
