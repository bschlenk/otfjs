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
