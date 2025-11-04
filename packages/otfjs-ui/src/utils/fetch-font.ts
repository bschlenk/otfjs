import { Font, isWoff2, NameId } from 'otfjs'
import fonts from '../fonts.json'
import { GOOGLE_FONT_DOMAIN } from '../constants'

const CACHE = new Map<string, Promise<Font>>()

/**
 * Fetches and loads a font from the given URL. If the font has already been
 * fetched, or the fetching is currently in progress, a reference to that same
 * promise is returned.
 */
export async function fetchFont(fontUrl: string) {
  let fontPromise = CACHE.get(fontUrl)

  if (!fontPromise) {
    fontPromise = loadFont(fontUrl)
    CACHE.set(fontUrl, fontPromise)
  }

  return fontPromise
}

export async function fetchFontByName(fontName: string) {
  const pathname = (fonts as Record<string, string>)[fontName]
  const url = new URL(pathname, GOOGLE_FONT_DOMAIN).toString()
  return fetchFont(url)
}

export async function readFont(data: Uint8Array) {
  if (isWoff2(data)) {
    const woff2 = await import('otfjs/woff2')
    data = woff2.decodeWoff2(data)
  }

  const font = new Font(data)
  await loadFontForUse(font)

  return font
}

async function loadFont(fontUrl: string) {
  const req = await fetch(fontUrl)
  const data = new Uint8Array(await req.arrayBuffer())
  return readFont(data)
}

async function loadFontForUse(font: Font) {
  const fontName = font.getName(NameId.FontFamilyName)!
  const newFont = new FontFace(fontName, font.data)
  await newFont.load()
  document.fonts.add(newFont)
}
