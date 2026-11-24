// https://learn.microsoft.com/en-us/typography/opentype/spec/gpos

import { s } from '@otfjs/buffer-gen/schema'

// https://learn.microsoft.com/en-us/typography/opentype/spec/chapter2#lookup-table
export const LookupFlag = s.flags('LookupFlag', s.u16(), {
  rightToLeft: 0,
  ignoreBaseGlyphs: 1,
  ignoreLigatures: 2,
  ignoreMarks: 3,
  useMarkFilteringSet: 4,
  markAttachmentTypeMask: [8, 8],
})

// Which fields a ValueRecord contains
export const ValueFormat = s.flags('ValueFormat', s.u16(), {
  xPlacement: 0,
  yPlacement: 1,
  xAdvance: 2,
  yAdvance: 3,
  xPlaDeviceOffset: 4,
  yPlaDeviceOffset: 5,
  xAdvDeviceOffset: 6,
  yAdvDeviceOffset: 7,
})
