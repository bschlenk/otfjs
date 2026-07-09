// https://learn.microsoft.com/en-us/typography/opentype/spec/math

import { s } from '@otfjs/buffer-gen/schema'

export const MathTable = s.struct('MathTable', {
  majorVersion: s.fixed(s.u16(), 1),
  minorVersion: s.fixed(s.u16(), 0),
  mathConstantsOffset: s.u16(
    'Offset to MathConstants table, from the beginning of MATH table',
  ),
  mathGlyphInfoOffset: s.u16(
    'Offset to MathGlyphInfo table, from the beginning of MATH table',
  ),
  mathVariantsOffset: s.u16(
    'Offset to MathVariants table, from the beginning of MATH table',
  ),
})
