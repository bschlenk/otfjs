export interface Cache<T> {
  get(key: string): T
}

export function createCache<T>(getter: (key: string) => T) {
  const values = new Map<string, T>()

  return {
    get(key: string): T {
      let value = values.get(key)

      if (!value) {
        value = getter(key)
        values.set(key, value)
      }

      return value
    },
  }
}
