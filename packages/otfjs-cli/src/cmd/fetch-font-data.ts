import { fetchJson } from '../lib/utils.js'

interface FontInfo {
  items: {
    family: string
    files: Record<string, string>
  }[]
}

export async function run() {
  const data = await fetchJson<FontInfo>(
    `https://www.googleapis.com/webfonts/v1/webfonts?key=${process.env.GOOGLE_API_KEY}`,
  )

  const info = processData(data)

  console.log(JSON.stringify(info, null, 2))
}

function processData(data: FontInfo) {
  const familyUrlMap: Record<string, string> = {}

  for (const { family, files } of data.items) {
    const url = new URL(getItemOrFirst(files, 'regular')!)
    familyUrlMap[family] = url.pathname
  }

  return familyUrlMap
}

function getItemOrFirst<T>(obj: Record<string, T>, key: string) {
  if (key in obj) return obj[key]

  const firstKey = getFirstKey(obj)
  if (firstKey) return obj[firstKey]

  return null
}

function getFirstKey(obj: Record<string, any>) {
  for (const key in obj) {
    return key
  }
  return null
}
