// https://learn.microsoft.com/en-us/typography/opentype/spec/os2

import { Reader } from '../buffer/reader.js'

export type OS2Table = ReturnType<typeof readOS2Table>

export function readOS2Table(view: Reader) {
  const version = view.u16()

  const xAvgCharWidth = view.i16()
  const usWeightClass = view.u16()
  const usWidthClass = view.u16()
  const fsType = view.u16()
  const ySubscriptXSize = view.i16()
  const ySubscriptYSize = view.i16()
  const ySubscriptXOffset = view.i16()
  const ySubscriptYOffset = view.i16()
  const ySuperscriptXSize = view.i16()
  const ySuperscriptYSize = view.i16()
  const ySuperscriptXOffset = view.i16()
  const ySuperscriptYOffset = view.i16()
  const yStrikeoutSize = view.i16()
  const yStrikeoutPosition = view.i16()
  const sFamilyClass = view.i16()
  const panose = view.u8Array(10)
  const ulUnicodeRange1 = view.u32()
  const ulUnicodeRange2 = view.u32()
  const ulUnicodeRange3 = view.u32()
  const ulUnicodeRange4 = view.u32()
  const achVendId = view.tag()
  const fsSelection = view.u16()
  const usFirstCharIndex = view.u16()
  const usLastCharIndex = view.u16()
  const sTypoAscender = view.i16()
  const sTypoDescender = view.i16()
  const sTypoLineGap = view.i16()
  const usWinAscent = view.u16()
  const usWinDescent = view.u16()

  let ulCodePageRange1 = null
  let ulCodePageRange2 = null
  let sxHeight = null
  let sCapHeight = null
  let usDefaultChar = null
  let usBreakChar = null
  let usMaxContext = null
  let usLowerOpticalPointSize = null
  let usUpperOpticalPointSize = null

  if (version >= 1) {
    ulCodePageRange1 = view.u32()
    ulCodePageRange2 = view.u32()

    if (version >= 2) {
      sxHeight = view.i16()
      sCapHeight = view.i16()
      usDefaultChar = view.u16()
      usBreakChar = view.u16()
      usMaxContext = view.u16()

      if (version >= 5) {
        usLowerOpticalPointSize = view.u16()
        usUpperOpticalPointSize = view.u16()
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
  }
}
