export interface Cache<K, V> {
  get(key: K): V
}

/**
 * Memoize `getter` per key. Null results aren't cached, since they mean
 * there was nothing to compute (e.g. a missing table) and are cheap to
 * recompute.
 */
export function createCache<K, V>(getter: (key: K) => V): Cache<K, V> {
  const values = new Map<K, V>()

  return {
    get(key: K): V {
      let value = values.get(key)

      if (value === undefined) {
        value = getter(key)
        if (value !== null) values.set(key, value)
      }

      return value
    },
  }
}
