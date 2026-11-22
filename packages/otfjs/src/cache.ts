export interface Cache<T> {
  get(key: string): T
}

export function createCache<T>(getter: (key: string) => T) {
  const values = new Map<string, T>()

  return {
    get(key: string): T {
      if (values.has(key)) return values.get(key) as T

      const value = getter(key)
      values.set(key, value)
      return value
    },
  }
}
