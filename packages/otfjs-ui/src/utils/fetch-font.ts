import { Font, isWoff2, NameId } from 'otfjs'

import { GOOGLE_FONT_DOMAIN } from '../constants'
import fonts from '../fonts.json'

let nextFontId = 0

const FONT_BY_URL_CACHE = new Map<string, Promise<Font>>()
const FONT_BY_ID_CACHE = new Map<number, Font>()

/**
 * Fetches and loads a font from the given URL. If the font has already been
 * fetched, or the fetching is currently in progress, a reference to that same
 * promise is returned.
 */
export async function fetchFont(fontUrl: string) {
  let fontPromise = FONT_BY_URL_CACHE.get(fontUrl)

  if (!fontPromise) {
    fontPromise = loadFont(fontUrl)
    FONT_BY_URL_CACHE.set(fontUrl, fontPromise)
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

export async function readAndCacheFont(data: Uint8Array) {
  const font = await readFont(data)
  const id = nextFontId++
  FONT_BY_ID_CACHE.set(id, font)
  return id
}

export function getFontById(fontId: number) {
  return FONT_BY_ID_CACHE.get(fontId) ?? null
}

async function loadFont(fontUrl: string) {
  const req = await fetch(fontUrl)
  const data = await req.bytes()
  return readFont(data)
}

async function loadFontForUse(font: Font) {
  const fontName = font.getName(NameId.FontFamilyName)!
  const newFont = new FontFace(fontName, font.data as Uint8Array<ArrayBuffer>)
  await newFont.load()
  document.fonts.add(newFont)
}
