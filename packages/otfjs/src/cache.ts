export interface Cache<K, V> {
  get(key: K): V
}

/**
 * Memoize `getter` per key. `undefined` means "not computed yet", so the
 * getter must not return it; `null` results are cached like any other.
 */
export function createCache<K, V>(getter: (key: K) => V): Cache<K, V> {
  const values = new Map<K, V>()

  return {
    get(key: K): V {
      let value = values.get(key)

      if (value === undefined) {
        value = getter(key)
        values.set(key, value)
      }

      return value
    },
  }
}
