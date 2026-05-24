// https://learn.microsoft.com/en-us/typography/opentype/spec/os2

import { s } from '@otfjs/buffer-gen/schema'

export const OS2Table = s.additive('OS2Table', s.u16(), {
  0: {
    xAvgCharWidth:        s.i16('Average weighted escapement'),
    usWeightClass:        s.u16('Visual weight of stroke in glyphs of the font'),
    usWidthClass:         s.u16('Relative change from the normal aspect ratio'),
    fsType:               s.u16('Licensing rights for the font'),
    ySubscriptXSize:      s.i16('Recommended horizontal size in font design units for subscripts'),
    ySubscriptYSize:      s.i16('Recommended vertical size in font design units for subscripts'),
    ySubscriptXOffset:    s.i16('Recommended horizontal offset for subscripts'),
    ySubscriptYOffset:    s.i16('Recommended vertical offset from the baseline for subscripts'),
    ySuperscriptXSize:    s.i16('Recommended horizontal size in font design units for superscripts'),
    ySuperscriptYSize:    s.i16('Recommended vertical size in font design units for superscripts'),
    ySuperscriptXOffset:  s.i16('Recommended horizontal offset for superscripts'),
    ySuperscriptYOffset:  s.i16('Recommended vertical offset from the baseline for superscripts'),
    yStrikeoutSize:       s.i16('Width of the strikeout stroke'),
    yStrikeoutPosition:   s.i16('Position of the top of the strikeout stroke relative to the baseline'),
    sFamilyClass:         s.i16('Classification of font-family design'),
    panose:               s.bytes(10, 'PANOSE classification number'),
    ulUnicodeRange1:      s.u32('Unicode Character Range, bits 0-31'),
    ulUnicodeRange2:      s.u32('Unicode Character Range, bits 32-63'),
    ulUnicodeRange3:      s.u32('Unicode Character Range, bits 64-95'),
    ulUnicodeRange4:      s.u32('Unicode Character Range, bits 96-127'),
    achVendId:            s.tag('Font vendor identification'),
    fsSelection:          s.u16('Font selection flags'),
    usFirstCharIndex:     s.u16('Minimum Unicode index in this font'),
    usLastCharIndex:      s.u16('Maximum Unicode index in this font'),
    sTypoAscender:        s.i16('Typographic ascender'),
    sTypoDescender:       s.i16('Typographic descender'),
    sTypoLineGap:         s.i16('Typographic line gap'),
    usWinAscent:          s.u16('Ascender metric for Windows'),
    usWinDescent:         s.u16('Descender metric for Windows'),
  },
  1: {
    ulCodePageRange1: s.u32('Code-page character range, bits 0-31'),
    ulCodePageRange2: s.u32('Code-page character range, bits 32-63'),
  },
  2: {
    sxHeight:       s.i16('Distance between the baseline and the approximate height of non-ascending lowercase letters'),
    sCapHeight:     s.i16('Distance between the baseline and the approximate height of uppercase letters'),
    usDefaultChar:  s.u16('Default character displayed by Windows in the event a glyph is not found'),
    usBreakChar:    s.u16('Glyph index used to separate words and justify text'),
    usMaxContext:   s.u16('Length of the longest target glyph context for any feature in this font'),
  },
  5: {
    usLowerOpticalPointSize: s.u16('Minimum size in exclusive ppem at which this font hint optimally'),
    usUpperOpticalPointSize: s.u16('Maximum size in exclusive ppem at which this font hint optimally'),
  },
})
