// https://learn.microsoft.com/en-us/typography/opentype/spec/hhea

import { s } from '@otfjs/buffer-gen/schema'

export const HheaTable = s.struct('HheaTable', {
  version: s.u32('Typically set to 0x00010000'),
  ascent: s.i16('Typographic ascent (ascender)'),
  descent: s.i16('Typographic descent (descender)'),
  lineGap: s.i16('Typographic line gap'),
  advanceWidthMax: s.u16('Maximum advance width value in `hmtx` table'),
  minLeftSideBearing: s.i16(
    'Minimum left sidebearing for glyphs with contours',
  ),
  minRightSideBearing: s.i16(
    'Minimum right sidebearing; min(aw - (lsb + xMax - xMin))',
  ),
  xMaxExtent: s.i16('max(lsb + (xMax - xMin))'),
  caretSlopeRise: s.i16('Slope of cursor (rise/run); 1 for vertical'),
  caretSlopeRun: s.i16('0 for vertical'),
  caretOffset: s.i16('Shift for slanted highlight; 0 for non-slanted fonts'),
  _reserved: s.reserved(8),
  metricDataFormat: s.i16('0 for current format'),
  numberOfHMetrics: s.u16('Number of hMetric entries in `hmtx` table'),
})
