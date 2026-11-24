import { PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'
import { CmapTableReader } from '../tables/cmap.js'
import { ColrTableReader } from '../tables/colr.js'
import { GlyfTag } from '../tables/glyf.js'
import { LocaTableReader } from '../tables/loca.js'
import { MetaTableReader } from '../tables/meta.js'
import { OS2TableReader } from '../tables/os-2.js'
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
 *    languages. Symbol fonts skip this (and step 2), so Wingdings shows its
 *    first two symbols, as Font Book does.
 * 2. A CJK sample, if the `OS/2` code page bits name exactly one CJK script.
 * 3. 😀, for emoji fonts.
 * 4. The script the font has the most letters in: a hand-picked sample for
 *    common scripts, or else its first letter (with its lowercase form, if
 *    the script has case).
 * 5. The first two symbols or icons, from private-use characters if the
 *    font has more of those than symbols.
 */
export function getSampleText(font: FontHandle): string {
  const inked = (text: string) => hasInk(font, text)

  // Symbol fonts have no Unicode cmap, and getGlyphIndex maps U+0041 to
  // their U+F041, so "Aa" would come out as two arbitrary symbols.
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

    const codePageSample = getCodePageSample(font)
    if (codePageSample && inked(codePageSample)) return codePageSample
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

interface Script {
  /** ISO 15924 code. */
  code: string
  /** Code point ranges, inclusive. */
  ranges: [number, number][]
  /** Samples to use, best first; the first the font fully covers wins. */
  samples: string[]
}

/** The sample for a ScriptLangTag from `dlng`, like `ko`, `zh-Hant`, `Cyrl`. */
function languageSample(tag: string): string | undefined {
  const [language, ...subtags] = tag.split(/[-_]/)
  const scriptCode = subtags.find((s) => s.length === 4)
  const region = subtags.find((s) => s.length === 2)?.toUpperCase()

  // A bare script code, like `Latn`.
  if (language.length === 4) return scriptSample(language)
  if (scriptCode) return scriptSample(scriptCode)

  if (language === 'zh') {
    return region && HANT_REGIONS.has(region) ? '漢' : '汉'
  }

  // Languages not listed are assumed to be written in Latin.
  const code = LANGUAGE_SCRIPTS[language.toLowerCase()] ?? 'Latn'
  return scriptSample(code)
}

function scriptSample(code: string): string | undefined {
  const normalized = code[0].toUpperCase() + code.slice(1).toLowerCase()
  return SCRIPT_ALIASES[normalized] ?? scriptsByCode.get(normalized)?.samples[0]
}

/** The CJK sample the OS/2 code page bits point to, if exactly one does. */
function getCodePageSample(font: FontHandle): string | undefined {
  const os2 = font.readTableOrNull(OS2TableReader)
  if (!os2 || os2.version === 0) return

  const bits = os2.ulCodePageRange1
  const samples = new Set(
    CODE_PAGE_SAMPLES.filter(([bit]) => bits & (1 << bit)).map(([, s]) => s),
  )
  return samples.size === 1 ? [...samples][0] : undefined
}

/** Whether the font's cmap only has a Windows symbol subtable. */
function isSymbolFont(font: FontHandle): boolean {
  const { encodingRecords } = font.readTable(CmapTableReader)
  const hasUnicode = encodingRecords.some(
    (r) =>
      r.platformId === PlatformId.Unicode ||
      (r.platformId === PlatformId.Windows &&
        (r.encodingId === 1 || r.encodingId === 10)),
  )
  const hasSymbol = encodingRecords.some(
    (r) => r.platformId === PlatformId.Windows && r.encodingId === 0,
  )
  return hasSymbol && !hasUnicode
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
    if (!LETTER.test(String.fromCodePoint(cp))) continue

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
    const isPair = UPPERCASE.test(char) && lower !== char
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
  const privateUse = chars.filter((char) => PRIVATE_USE.test(char))
  const symbols = chars.filter((char) => SYMBOL.test(char))
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
  const colr = font.readTableOrNull(ColrTableReader)
  if (colr?.colorGlyph(glyphId)) return true

  const loca = font.readTableOrNull(LocaTableReader)
  const glyf = font.getTableViewOrNull(GlyfTag)
  // Without glyf (e.g. CFF outlines), assume any mapped glyph has ink.
  if (!loca || !glyf) return true

  const offset = loca[glyphId]
  if (loca[glyphId + 1] <= offset) return false

  // The glyph header: numberOfContours, then its bounding box.
  const header = glyf.subtable(offset, 10)
  header.skip(2)
  const xMin = header.i16()
  const yMin = header.i16()
  const xMax = header.i16()
  const yMax = header.i16()
  return xMax > xMin || yMax > yMin
}

const SCRIPTS: Script[] = [
  {
    code: 'Latn',
    ranges: [
      [0x41, 0x5a],
      [0x61, 0x7a],
      [0xc0, 0x24f],
    ],
    samples: ['Aa'],
  },
  { code: 'Grek', ranges: [[0x370, 0x3ff]], samples: ['Ωω'] },
  { code: 'Cyrl', ranges: [[0x400, 0x52f]], samples: ['Бб'] },
  { code: 'Armn', ranges: [[0x531, 0x58f]], samples: ['Աա'] },
  { code: 'Hebr', ranges: [[0x591, 0x5ff]], samples: ['א'] },
  {
    code: 'Arab',
    ranges: [
      [0x600, 0x6ff],
      [0x750, 0x77f],
      [0x8a0, 0x8ff],
    ],
    samples: ['ع'],
  },
  { code: 'Deva', ranges: [[0x900, 0x97f]], samples: ['क'] },
  { code: 'Beng', ranges: [[0x980, 0x9ff]], samples: ['ক'] },
  { code: 'Guru', ranges: [[0xa00, 0xa7f]], samples: ['ਕ'] },
  { code: 'Gujr', ranges: [[0xa80, 0xaff]], samples: ['ક'] },
  { code: 'Orya', ranges: [[0xb00, 0xb7f]], samples: ['କ'] },
  { code: 'Taml', ranges: [[0xb80, 0xbff]], samples: ['க'] },
  { code: 'Telu', ranges: [[0xc00, 0xc7f]], samples: ['క'] },
  { code: 'Knda', ranges: [[0xc80, 0xcff]], samples: ['ಕ'] },
  { code: 'Mlym', ranges: [[0xd00, 0xd7f]], samples: ['ക'] },
  { code: 'Sinh', ranges: [[0xd80, 0xdff]], samples: ['ක'] },
  { code: 'Thai', ranges: [[0xe01, 0xe7f]], samples: ['ก'] },
  { code: 'Laoo', ranges: [[0xe81, 0xeff]], samples: ['ກ'] },
  { code: 'Tibt', ranges: [[0xf00, 0xfff]], samples: ['ཀ'] },
  { code: 'Mymr', ranges: [[0x1000, 0x109f]], samples: ['က'] },
  { code: 'Geor', ranges: [[0x10a0, 0x10ff]], samples: ['Ⴀა', 'ა'] },
  {
    code: 'Hang',
    ranges: [
      [0xac00, 0xd7a3],
      [0x1100, 0x11ff],
      [0x3131, 0x318e],
    ],
    samples: ['동'],
  },
  { code: 'Ethi', ranges: [[0x1200, 0x139f]], samples: ['አ'] },
  { code: 'Cher', ranges: [[0x13a0, 0x13ff]], samples: ['Ꮳꮳ', 'Ꮳ'] },
  { code: 'Khmr', ranges: [[0x1780, 0x17ff]], samples: ['ក'] },
  { code: 'Mong', ranges: [[0x1800, 0x18af]], samples: ['ᠮ'] },
  { code: 'Kana', ranges: [[0x3041, 0x30ff]], samples: ['あ'] },
  {
    code: 'Hani',
    ranges: [
      [0x4e00, 0x9fff],
      [0x3400, 0x4dbf],
    ],
    samples: ['汉', '漢'],
  },
  { code: 'Phag', ranges: [[0xa840, 0xa877]], samples: ['ꡀ'] },
]

const LETTER = /\p{L}/u
const UPPERCASE = /\p{Lu}/u

const PRIVATE_USE = /\p{Co}/u
const SYMBOL = /\p{S}/u

const scriptsByCode = new Map(SCRIPTS.map((s) => [s.code, s]))

/** Script codes whose sample isn't their entry's first one. */
const SCRIPT_ALIASES: Record<string, string> = {
  Hans: '汉',
  Hant: '漢',
  Hira: 'あ',
  Jpan: 'あ',
  Kore: '동',
}

/** Regions that write Chinese with Traditional characters. */
const HANT_REGIONS = new Set(['TW', 'HK', 'MO'])

/** Script codes for languages written in a non-Latin script. */
const LANGUAGE_SCRIPTS: Record<string, string> = {
  am: 'Ethi',
  ar: 'Arab',
  be: 'Cyrl',
  bg: 'Cyrl',
  bn: 'Beng',
  bo: 'Tibt',
  chr: 'Cher',
  el: 'Grek',
  fa: 'Arab',
  gu: 'Gujr',
  he: 'Hebr',
  hi: 'Deva',
  hy: 'Armn',
  ja: 'Jpan',
  ka: 'Geor',
  km: 'Khmr',
  kn: 'Knda',
  ko: 'Kore',
  lo: 'Laoo',
  mk: 'Cyrl',
  ml: 'Mlym',
  mn: 'Cyrl',
  mr: 'Deva',
  my: 'Mymr',
  ne: 'Deva',
  or: 'Orya',
  pa: 'Guru',
  ps: 'Arab',
  ru: 'Cyrl',
  sa: 'Deva',
  si: 'Sinh',
  sr: 'Cyrl',
  ta: 'Taml',
  te: 'Telu',
  th: 'Thai',
  ti: 'Ethi',
  uk: 'Cyrl',
  ur: 'Arab',
  yi: 'Hebr',
  yue: 'Hant',
}

/** OS/2 ulCodePageRange1 bits for CJK code pages, and their samples. */
const CODE_PAGE_SAMPLES: [number, string][] = [
  [17, 'あ'], // JIS/Japan
  [18, '汉'], // Chinese: Simplified (PRC and Singapore)
  [19, '동'], // Korean Wansung
  [20, '漢'], // Chinese: Traditional (Taiwan, Hong Kong SAR)
  [21, '동'], // Korean Johab
]
