import type { Reader } from '@otfjs/buffer'

import { PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'
import {
  HANT,
  HANT_REGIONS,
  LATIN,
  type Script,
  SCRIPTS,
} from '../sample-scripts.js'
import { CmapTableReader } from '../tables/cmap.js'
import { ColrTableReader } from '../tables/colr.js'
import { GlyfTag } from '../tables/glyf.js'
import { LocaTableReader } from '../tables/loca.js'
import { MetaTableReader } from '../tables/meta.js'
import { getGlyphIndex } from './get-glyph-index.js'

/**
 * A short string to preview the font with, like "Aa" for a Latin font or
 * "漢" for a Traditional Chinese one, modeled on the samples macOS Font Book
 * shows. Every character in it has a glyph with outlines in the font. Empty
 * if the font has nothing suitable.
 *
 * In order, it tries:
 * 1. "Aa", and the sample for each language or script in the `meta`
 *    table's `dlng`. "Aa" goes first unless `dlng` only lists non-Latin
 *    languages. Symbol fonts skip this, so Wingdings shows its first two
 *    symbols, as Font Book does.
 * 2. 😀, for emoji fonts.
 * 3. The script the font has the most letters in: a hand-picked sample for
 *    common scripts, or else its first letter (with its lowercase form, if
 *    the script has case).
 * 4. The first two symbols or icons, from private-use characters if the
 *    font has more of those than symbols.
 */
export function getSampleText(font: FontHandle): string {
  const inked = (text: string) => hasInk(font, text)

  // getGlyphIndex maps U+0041 to a symbol font's U+F041, so "Aa" would come
  // out as two arbitrary symbols.
  if (!isSymbolFont(font)) {
    // A font designed only for non-Latin languages shows their sample even
    // if it also covers Latin, e.g. 동 for a Korean font.
    const dlng = font.readTableOrNull(MetaTableReader)?.designLanguages ?? []
    const dlngSamples = dlng.map(languageSample).filter((s) => s != null)
    const latinFirst = dlngSamples.length === 0 || dlngSamples.includes('Aa')
    const candidates =
      latinFirst ? ['Aa', ...dlngSamples] : [...dlngSamples, 'Aa']
    for (const sample of candidates) {
      if (inked(sample)) return sample
    }
  }

  // Checked before letters: emoji fonts map a few letter-like characters,
  // like ℹ (U+2139).
  if (inked('😀')) return '😀'

  const codePoints = mappedCodePoints(font)

  for (const group of groupLetters(codePoints)) {
    const sample =
      group.script?.samples.find(inked) ?? letterSample(font, group.letters)
    if (sample) return sample
  }

  return symbolSample(font, codePoints)
}

/** The sample for a ScriptLangTag from `dlng`, like `ko`, `zh-Hant`, `Cyrl`. */
function languageSample(tag: string): string | undefined {
  const [language, ...subtags] = tag.toLowerCase().split(/[-_]/)
  // A bare script code like `Latn`, or one in a subtag like `zh-Hant`.
  const scriptCode =
    language.length === 4 ? language : subtags.find((s) => s.length === 4)
  const region = subtags.find((s) => s.length === 2)

  const script =
    scriptCode ? SCRIPTS.find((s) => s.codes.includes(scriptCode))
    : language === 'zh' && region && HANT_REGIONS.has(region) ? HANT
      // Languages not listed are assumed to be written in Latin.
    : (SCRIPTS.find((s) => s.languages.includes(language)) ?? LATIN)

  return script?.samples[0]
}

/**
 * Whether getGlyphIndex looks code points up in the font's Windows symbol
 * subtable, which it prefers over Unicode ones whenever the font has one.
 */
function isSymbolFont(font: FontHandle): boolean {
  return font
    .readTable(CmapTableReader)
    .encodingRecords.some(
      (r) =>
        r.platformId === PlatformId.Windows &&
        r.encodingId === 0 &&
        (r.subtable.format === 4 || r.subtable.format === 12),
    )
}

/** Every code point the font's readable cmap subtables map, ascending. */
function mappedCodePoints(font: FontHandle): number[] {
  const candidates = new Set<number>()

  for (const { subtable } of font.readTable(CmapTableReader).encodingRecords) {
    if (subtable.format === 4) {
      subtable.startCodes.forEach((start, i) => {
        const end = Math.min(subtable.endCodes[i], 0xfffe)
        for (let cp = start; cp <= end; ++cp) candidates.add(cp)
      })
    } else if (subtable.format === 12) {
      for (const { startCharCode, endCharCode } of subtable.groups) {
        for (let cp = startCharCode; cp <= endCharCode; ++cp) {
          candidates.add(cp)
        }
      }
    }
  }

  return [...candidates]
    .filter((cp) => getGlyphIndex(font, cp) !== 0)
    .sort((a, b) => a - b)
}

interface LetterGroup {
  /** The known script the letters are in, if any. */
  script: Script | undefined
  letters: number[]
}

/**
 * The font's letters, grouped by known script, or else by 128-code-point
 * block, most letters first.
 */
function groupLetters(codePoints: number[]): LetterGroup[] {
  const groups = new Map<Script | number, LetterGroup>()

  for (const cp of codePoints) {
    if (!RE_LETTER.test(String.fromCodePoint(cp))) continue

    const script = SCRIPTS.find((s) =>
      s.ranges.some(([start, end]) => cp >= start && cp <= end),
    )
    const key = script ?? cp >> 7
    let group = groups.get(key)
    if (!group) groups.set(key, (group = { script, letters: [] }))
    group.letters.push(cp)
  }

  return [...groups.values()].sort(
    (a, b) => b.letters.length - a.letters.length,
  )
}

/**
 * The first letter in `letters` with ink, followed by its lowercase form if
 * it's uppercase and the font has that too.
 */
function letterSample(font: FontHandle, letters: number[]): string | null {
  for (const cp of letters) {
    const char = String.fromCodePoint(cp)
    if (!hasInk(font, char)) continue

    const lower = char.toLowerCase()
    const isPair = RE_UPPERCASE.test(char) && lower !== char
    return isPair && hasInk(font, lower) ? char + lower : char
  }

  return null
}

/**
 * The first two symbols or private-use characters with ink, whichever the
 * font has more of.
 */
function symbolSample(font: FontHandle, codePoints: number[]): string {
  const chars = codePoints.map((cp) => String.fromCodePoint(cp))
  const privateUse = chars.filter((char) => RE_PRIVATE_USE.test(char))
  const symbols = chars.filter((char) => RE_SYMBOL.test(char))
  const candidates = privateUse.length >= symbols.length ? privateUse : symbols

  let text = ''
  let count = 0
  for (const char of candidates) {
    if (!hasInk(font, char)) continue
    text += char
    if (++count === 2) break
  }
  return text
}

/** Whether every character in `text` maps to a glyph that draws something. */
function hasInk(font: FontHandle, text: string): boolean {
  // for...of iterates by code point, so an emoji is one character, not the
  // two UTF-16 code units it's stored as.
  for (const char of text) {
    const glyphId = getGlyphIndex(font, char.codePointAt(0)!)
    if (glyphId === 0 || !glyphHasInk(font, glyphId)) return false
  }
  return true
}

/**
 * Whether a glyph draws something: outlines with a non-empty bounding box,
 * or color layers. Fonts can map characters to blank glyphs, e.g. Material
 * Icons maps letters to single-point glyphs that only exist to spell out
 * icon names for ligatures.
 */
function glyphHasInk(font: FontHandle, glyphId: number): boolean {
  if (font.readTableOrNull(ColrTableReader)?.hasColorGlyph(glyphId)) {
    return true
  }

  const loca = font.readTableOrNull(LocaTableReader)
  const glyf = font.getTableViewOrNull(GlyfTag)
  // Without glyf (e.g. CFF outlines), assume any mapped glyph has ink.
  if (!loca || !glyf) return true

  const offset = loca[glyphId]
  if (loca[glyphId + 1] <= offset) return false

  return boundsHaveArea(glyf.subtable(offset, 10))
}

/**
 * Whether the bounding box in a glyf glyph header is more than a point, read
 * without decoding the glyph. A line still counts, e.g. a hyphen.
 */
function boundsHaveArea(header: Reader): boolean {
  header.skip(2) // numberOfContours
  const xMin = header.i16()
  const yMin = header.i16()
  const xMax = header.i16()
  const yMax = header.i16()
  return xMax > xMin || yMax > yMin
}

const RE_LETTER = /\p{L}/u
const RE_UPPERCASE = /\p{Lu}/u

const RE_PRIVATE_USE = /\p{Co}/u
const RE_SYMBOL = /\p{S}/u
