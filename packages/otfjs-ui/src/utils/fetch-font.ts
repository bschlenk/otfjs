import { Font, isWoff2, NameId } from 'otfjs'

const CACHE = new Map<string, Promise<Font>>()

/**
 * Fetches and loads a font from the given URL. If the font has already been
 * fetched, or the fetching is currently in progress, a reference to that same
 * promise is returned.
 */
export async function fetchFont(fontUrl: string) {
  let fontPromise = CACHE.get(fontUrl)

  if (!fontPromise) {
    fontPromise = fetchFontInternal(fontUrl)
    CACHE.set(fontUrl, fontPromise)
  }

  return fontPromise
}

async function fetchFontInternal(fontUrl: string) {
  const req = await fetch(fontUrl)
  const data = await req.bytes()
  return loadFont(data)
}

export async function loadFont(data: Uint8Array) {
  const font = await readFont(data)
  await loadFontForUse(font)
  return font
}

async function readFont(data: Uint8Array) {
  if (isWoff2(data)) {
    const woff2 = await import('otfjs/woff2')
    data = woff2.decodeWoff2(data)
  }

  return new Font(data)
}

async function loadFontForUse(font: Font) {
  const fontName = font.getName(NameId.FontFamilyName)!
  const newFont = new FontFace(fontName, font.data)
  await newFont.load()
  document.fonts.add(newFont)
}
