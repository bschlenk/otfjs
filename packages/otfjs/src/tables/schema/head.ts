// https://learn.microsoft.com/en-us/typography/opentype/spec/head

import { s } from '@otfjs/buffer-gen/schema'

export const MacStyle = s.flags('MacStyle', s.u16(), {
  bold:      0,
  italic:    1,
  underline: 2,
  outline:   3,
  shadow:    4,
  condensed: 5,
  extended:  6,
})

export const HeadFlags = s.flags('HeadFlags', s.u16(), {
  baselineAtY0:                     0,
  leftSidebearingAtX0:              1,
  instructionsMayDependOnPointSize: 2,
  forcePpemToIntegers:              3,
  instructionsMayAlterAdvanceWidth: 4,
  lossless:                         11,
  converted:                        12,
  clearTypeOptimized:               13,
  lastResortFont:                   14,
})

export const HeadTable = s.struct('HeadTable', {
  majorVersion:       s.fixed(s.u16(), 1),
  minorVersion:       s.fixed(s.u16(), 0),
  fontRevision:       s.u32('Set by font manufacturer'),
  checksumAdjustment: s.u32('To compute: set it to 0, sum the entire font as uint32, then store 0xB1B0AFBA - sum'),
  magicNumber:        s.fixed(s.u32(), 0x5F0F3CF5),
  flags:              HeadFlags,
  unitsPerEm:         s.u16('Valid range is from 16 to 16384'),
  created:            s.date('Seconds since 12:00 midnight, January 1st 1904, UTC'),
  modified:           s.date('Seconds since 12:00 midnight, January 1st 1904, UTC'),
  xMin:               s.i16('Minimum x coordinate across all glyph bounding boxes'),
  yMin:               s.i16('Minimum y coordinate across all glyph bounding boxes'),
  xMax:               s.i16('Maximum x coordinate across all glyph bounding boxes'),
  yMax:               s.i16('Maximum y coordinate across all glyph bounding boxes'),
  macStyle:           MacStyle,
  lowestRecPpem:      s.u16('Smallest readable size in pixels'),
  fontDirectionHint:  s.fixed(s.i16(), 2),
  indexToLocFormat:   s.i16('0 for short offsets (Offset16), 1 for long (Offset32)'),
  glyphDataFormat:    s.fixed(s.i16(), 0),
})
