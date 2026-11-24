// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { s } from '@otfjs/buffer-gen/schema'

// The flag byte stored for each point of a simple glyph
export const GlyphFlags = s.flags('GlyphFlags', s.u8(), {
  onCurvePoint: 0,
  xShortVector: 1,
  yShortVector: 2,
  repeat: 3,
  xIsSameOrPositiveXShortVector: 4,
  yIsSameOrPositiveYShortVector: 5,
  contoursOverlap: 6,
})
