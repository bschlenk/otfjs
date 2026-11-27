// https://adobe-type-tools.github.io/font-tech-notes/pdfs/5176.CFF.pdf

import { Reader } from '@otfjs/buffer'

import {
  type CffDict,
  PRIVATE_DICT_OPERATORS,
  readCffDict,
  TOP_DICT_OPERATORS,
} from '../cff/cff.dict.js'
import { type CffIndex, readCffIndex } from '../cff/cff.index.js'
import type { TableReader } from '../table-reader.js'
import { utf8Decoder } from '../utils/text.js'
import { assert } from '../utils/utils.js'

export type { CffDict } from '../cff/cff.dict.js'
export type { CffIndex } from '../cff/cff.index.js'

/**
 * The CFF table, with what's needed to draw its glyphs. An OpenType font's
 * CFF table holds exactly one font.
 */
export interface CffTable {
  major: number
  minor: number
  /** The PostScript name of each font. */
  names: string[]
  /** The font's Top DICT. Strings are SIDs into `strings`. */
  topDict: CffDict
  /** Strings past the 391 standard ones: SID 391 is `strings[0]`. */
  strings: string[]
  globalSubrs: CffIndex
  /** Each glyph's charstring, by glyph id. */
  charStrings: CffIndex
  /**
   * The Private DICT glyphs use. CID-keyed fonts have one per Font DICT,
   * chosen for each glyph by `fdSelect`; other fonts have one.
   */
  privateDicts: CffPrivateDict[]
  /** For CID-keyed fonts, each glyph's index into `privateDicts`. */
  fdSelect: Uint8Array | null
}

export interface CffPrivateDict {
  dict: CffDict
  /** The Private DICT's own subroutines, if it has any. */
  subrs: CffIndex | null
  defaultWidthX: number
  nominalWidthX: number
}

export function readCffTable(view: Reader): CffTable {
  const major = view.u8()
  const minor = view.u8()
  const hdrSize = view.u8()
  view.u8() // offSize, which nothing uses

  assert(major === 1, `Unsupported CFF version ${major}.${minor}`)

  view.skip(hdrSize - 4)
  const names = readStrings(readCffIndex(view))
  const topDicts = readCffIndex(view)
  const strings = readStrings(readCffIndex(view))
  const globalSubrs = readCffIndex(view)

  assert(topDicts.count >= 1, 'CFF table has no fonts')
  const topDict = readCffDict(new Reader(topDicts.get(0)), TOP_DICT_OPERATORS)

  const charstringType = topDict.CharstringType?.[0] ?? 2
  assert(charstringType === 2, `Unsupported charstring type ${charstringType}`)

  assert(topDict.CharStrings !== undefined, 'CFF font has no CharStrings')
  const charStrings = readCffIndex(view.subtable(topDict.CharStrings[0]))

  let privateDicts: CffPrivateDict[]
  let fdSelect: Uint8Array | null = null

  if (topDict.FDArray) {
    // CID-keyed: each Font DICT has its own Private DICT
    const fontDicts = readCffIndex(view.subtable(topDict.FDArray[0]))
    privateDicts = Array.from({ length: fontDicts.count }, (_, i) => {
      const fontDict = readCffDict(
        new Reader(fontDicts.get(i)),
        TOP_DICT_OPERATORS,
      )
      return readPrivateDict(view, fontDict.Private)
    })

    assert(topDict.FDSelect !== undefined, 'CID-keyed CFF font has no FDSelect')
    fdSelect = readFdSelect(
      view.subtable(topDict.FDSelect[0]),
      charStrings.count,
    )
  } else {
    privateDicts = [readPrivateDict(view, topDict.Private)]
  }

  return {
    major,
    minor,
    names,
    topDict,
    strings,
    globalSubrs,
    charStrings,
    privateDicts,
    fdSelect,
  }
}

export const CffTag = 'CFF '

export const CffTableReader: TableReader<CffTable> = {
  tag: CffTag,
  read: readCffTable,
}

function readStrings(index: CffIndex) {
  return Array.from({ length: index.count }, (_, i) =>
    utf8Decoder.decode(index.get(i)),
  )
}

/** `Private` is the DICT's size and its offset from the CFF table start. */
function readPrivateDict(
  view: Reader,
  location: number[] | undefined,
): CffPrivateDict {
  if (!location) {
    return { dict: {}, subrs: null, defaultWidthX: 0, nominalWidthX: 0 }
  }

  const [size, offset] = location
  const dict = readCffDict(view.subtable(offset, size), PRIVATE_DICT_OPERATORS)

  // Subrs is an offset from the start of the Private DICT
  const subrs =
    dict.Subrs ? readCffIndex(view.subtable(offset + dict.Subrs[0])) : null

  return {
    dict,
    subrs,
    defaultWidthX: dict.defaultWidthX?.[0] ?? 0,
    nominalWidthX: dict.nominalWidthX?.[0] ?? 0,
  }
}

/** Each glyph's Font DICT, in format 0 (one byte per glyph) or 3 (ranges). */
function readFdSelect(view: Reader, numGlyphs: number): Uint8Array {
  const format = view.u8()
  if (format === 0) return view.u8Array(numGlyphs)

  assert(format === 3, `Unsupported CFF FDSelect format ${format}`)

  const fds = new Uint8Array(numGlyphs)
  const nRanges = view.u16()
  let first = view.u16()
  for (let i = 0; i < nRanges; ++i) {
    const fd = view.u8()
    const next = view.u16()
    fds.fill(fd, first, Math.min(next, numGlyphs))
    first = next
  }
  return fds
}
