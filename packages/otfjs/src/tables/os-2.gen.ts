// This file is auto-generated from src/tables/schema/os-2.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader, Writer } from '@otfjs/buffer'

interface OS2TableTier0 {
  /** Average weighted escapement */
  xAvgCharWidth: number
  /** Visual weight of stroke in glyphs of the font */
  usWeightClass: number
  /** Relative change from the normal aspect ratio */
  usWidthClass: number
  /** Licensing rights for the font */
  fsType: number
  /** Recommended horizontal size in font design units for subscripts */
  ySubscriptXSize: number
  /** Recommended vertical size in font design units for subscripts */
  ySubscriptYSize: number
  /** Recommended horizontal offset for subscripts */
  ySubscriptXOffset: number
  /** Recommended vertical offset from the baseline for subscripts */
  ySubscriptYOffset: number
  /** Recommended horizontal size in font design units for superscripts */
  ySuperscriptXSize: number
  /** Recommended vertical size in font design units for superscripts */
  ySuperscriptYSize: number
  /** Recommended horizontal offset for superscripts */
  ySuperscriptXOffset: number
  /** Recommended vertical offset from the baseline for superscripts */
  ySuperscriptYOffset: number
  /** Width of the strikeout stroke */
  yStrikeoutSize: number
  /** Position of the top of the strikeout stroke relative to the baseline */
  yStrikeoutPosition: number
  /** Classification of font-family design */
  sFamilyClass: number
  /** PANOSE classification number */
  panose: Uint8Array
  /** Unicode Character Range, bits 0-31 */
  ulUnicodeRange1: number
  /** Unicode Character Range, bits 32-63 */
  ulUnicodeRange2: number
  /** Unicode Character Range, bits 64-95 */
  ulUnicodeRange3: number
  /** Unicode Character Range, bits 96-127 */
  ulUnicodeRange4: number
  /** Font vendor identification */
  achVendId: string
  /** Font selection flags */
  fsSelection: number
  /** Minimum Unicode index in this font */
  usFirstCharIndex: number
  /** Maximum Unicode index in this font */
  usLastCharIndex: number
  /** Typographic ascender */
  sTypoAscender: number
  /** Typographic descender */
  sTypoDescender: number
  /** Typographic line gap */
  sTypoLineGap: number
  /** Ascender metric for Windows */
  usWinAscent: number
  /** Descender metric for Windows */
  usWinDescent: number
}

interface OS2TableTier1 {
  /** Code-page character range, bits 0-31 */
  ulCodePageRange1: number
  /** Code-page character range, bits 32-63 */
  ulCodePageRange2: number
}

interface OS2TableTier2 {
  /** Distance between the baseline and the approximate height of non-ascending lowercase letters */
  sxHeight: number
  /** Distance between the baseline and the approximate height of uppercase letters */
  sCapHeight: number
  /** Default character displayed by Windows in the event a glyph is not found */
  usDefaultChar: number
  /** Glyph index used to separate words and justify text */
  usBreakChar: number
  /** Length of the longest target glyph context for any feature in this font */
  usMaxContext: number
}

interface OS2TableTier5 {
  /** Minimum size in exclusive ppem at which this font hint optimally */
  usLowerOpticalPointSize: number
  /** Maximum size in exclusive ppem at which this font hint optimally */
  usUpperOpticalPointSize: number
}

export interface OS2TableV0 extends OS2TableTier0 {
  version: 0
}

export interface OS2TableV1 extends OS2TableTier0, OS2TableTier1 {
  version: 1
}

export interface OS2TableV2
  extends OS2TableTier0, OS2TableTier1, OS2TableTier2 {
  version: 2 | 3 | 4
}

export interface OS2TableV5
  extends OS2TableTier0, OS2TableTier1, OS2TableTier2, OS2TableTier5 {
  version: 5
}

export type OS2Table = OS2TableV0 | OS2TableV1 | OS2TableV2 | OS2TableV5

export function readOS2Table(r: Reader): OS2Table {
  const version = r.u16()
  const xAvgCharWidth = r.i16()
  const usWeightClass = r.u16()
  const usWidthClass = r.u16()
  const fsType = r.u16()
  const ySubscriptXSize = r.i16()
  const ySubscriptYSize = r.i16()
  const ySubscriptXOffset = r.i16()
  const ySubscriptYOffset = r.i16()
  const ySuperscriptXSize = r.i16()
  const ySuperscriptYSize = r.i16()
  const ySuperscriptXOffset = r.i16()
  const ySuperscriptYOffset = r.i16()
  const yStrikeoutSize = r.i16()
  const yStrikeoutPosition = r.i16()
  const sFamilyClass = r.i16()
  const panose = r.u8Array(10)
  const ulUnicodeRange1 = r.u32()
  const ulUnicodeRange2 = r.u32()
  const ulUnicodeRange3 = r.u32()
  const ulUnicodeRange4 = r.u32()
  const achVendId = r.tag()
  const fsSelection = r.u16()
  const usFirstCharIndex = r.u16()
  const usLastCharIndex = r.u16()
  const sTypoAscender = r.i16()
  const sTypoDescender = r.i16()
  const sTypoLineGap = r.i16()
  const usWinAscent = r.u16()
  const usWinDescent = r.u16()
  let ulCodePageRange1: number | undefined
  let ulCodePageRange2: number | undefined
  let sxHeight: number | undefined
  let sCapHeight: number | undefined
  let usDefaultChar: number | undefined
  let usBreakChar: number | undefined
  let usMaxContext: number | undefined
  let usLowerOpticalPointSize: number | undefined
  let usUpperOpticalPointSize: number | undefined
  if (version >= 1) {
    ulCodePageRange1 = r.u32()
    ulCodePageRange2 = r.u32()
    if (version >= 2) {
      sxHeight = r.i16()
      sCapHeight = r.i16()
      usDefaultChar = r.u16()
      usBreakChar = r.u16()
      usMaxContext = r.u16()
      if (version >= 5) {
        usLowerOpticalPointSize = r.u16()
        usUpperOpticalPointSize = r.u16()
      }
    }
  }
  return {
    version,
    xAvgCharWidth,
    usWeightClass,
    usWidthClass,
    fsType,
    ySubscriptXSize,
    ySubscriptYSize,
    ySubscriptXOffset,
    ySubscriptYOffset,
    ySuperscriptXSize,
    ySuperscriptYSize,
    ySuperscriptXOffset,
    ySuperscriptYOffset,
    yStrikeoutSize,
    yStrikeoutPosition,
    sFamilyClass,
    panose,
    ulUnicodeRange1,
    ulUnicodeRange2,
    ulUnicodeRange3,
    ulUnicodeRange4,
    achVendId,
    fsSelection,
    usFirstCharIndex,
    usLastCharIndex,
    sTypoAscender,
    sTypoDescender,
    sTypoLineGap,
    usWinAscent,
    usWinDescent,
    ulCodePageRange1,
    ulCodePageRange2,
    sxHeight,
    sCapHeight,
    usDefaultChar,
    usBreakChar,
    usMaxContext,
    usLowerOpticalPointSize,
    usUpperOpticalPointSize,
  } as OS2Table
}

export function writeOS2Table(d: OS2Table): Uint8Array {
  let size = 78
  if (d.version >= 1) size += 8
  if (d.version >= 2) size += 10
  if (d.version >= 5) size += 4
  const w = new Writer(size)
  w.u16(d.version)
  w.i16(d.xAvgCharWidth)
  w.u16(d.usWeightClass)
  w.u16(d.usWidthClass)
  w.u16(d.fsType)
  w.i16(d.ySubscriptXSize)
  w.i16(d.ySubscriptYSize)
  w.i16(d.ySubscriptXOffset)
  w.i16(d.ySubscriptYOffset)
  w.i16(d.ySuperscriptXSize)
  w.i16(d.ySuperscriptYSize)
  w.i16(d.ySuperscriptXOffset)
  w.i16(d.ySuperscriptYOffset)
  w.i16(d.yStrikeoutSize)
  w.i16(d.yStrikeoutPosition)
  w.i16(d.sFamilyClass)
  w.buffer(d.panose)
  w.u32(d.ulUnicodeRange1)
  w.u32(d.ulUnicodeRange2)
  w.u32(d.ulUnicodeRange3)
  w.u32(d.ulUnicodeRange4)
  w.tag(d.achVendId)
  w.u16(d.fsSelection)
  w.u16(d.usFirstCharIndex)
  w.u16(d.usLastCharIndex)
  w.i16(d.sTypoAscender)
  w.i16(d.sTypoDescender)
  w.i16(d.sTypoLineGap)
  w.u16(d.usWinAscent)
  w.u16(d.usWinDescent)
  if (d.version >= 1) {
    const d1 = d as OS2TableV1
    w.u32(d1.ulCodePageRange1)
    w.u32(d1.ulCodePageRange2)
    if (d.version >= 2) {
      const d2 = d as OS2TableV2
      w.i16(d2.sxHeight)
      w.i16(d2.sCapHeight)
      w.u16(d2.usDefaultChar)
      w.u16(d2.usBreakChar)
      w.u16(d2.usMaxContext)
      if (d.version >= 5) {
        const d5 = d as OS2TableV5
        w.u16(d5.usLowerOpticalPointSize)
        w.u16(d5.usUpperOpticalPointSize)
      }
    }
  }
  return w.toBuffer()
}
