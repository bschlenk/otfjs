// https://learn.microsoft.com/en-us/typography/opentype/spec/post

import { s } from '@otfjs/buffer-gen/schema'

const baseFields = {
  italicAngle:        s.i32('Italic angle in counter-clockwise degrees from the vertical (fixed-point 16.16)'),
  underlinePosition:  s.i16('Suggested distance of the top of the underline from the baseline (negative: below baseline)'),
  underlineThickness: s.i16('Suggested values for the underline thickness'),
  isFixedPitch:       s.u32('Set to 0 if the font is proportionally spaced, non-zero if monospaced'),
  minMemType42:       s.u32('Minimum memory usage when an OpenType font is downloaded'),
  maxMemType42:       s.u32('Maximum memory usage when an OpenType font is downloaded'),
  minMemType1:        s.u32('Minimum memory usage when an OpenType font is downloaded as a Type 1 font'),
  maxMemType1:        s.u32('Maximum memory usage when an OpenType font is downloaded as a Type 1 font'),
}

export const PostTable = s.versioned('PostTable', s.u32(), {
  [0x00010000]: s.struct('PostTable01', baseFields),
  [0x00020000]: s.struct('PostTable02', {
    ...baseFields,
    numGlyphs:        s.u16('Number of glyphs in the font'),
    glyphNameIndexes: s.array('numGlyphs', s.u16()),
  }),
  [0x00030000]: s.struct('PostTable03', baseFields),
})
