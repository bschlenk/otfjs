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

// The flags on each component of a composite glyph
export const GlyphCompositeFlags = s.flags('GlyphCompositeFlags', s.u16(), {
  arg1And2AreWords: 0,
  argsAreXYValues: 1,
  roundXYToGrid: 2,
  weHaveAScale: 3,
  moreComponents: 5,
  weHaveAnXAndYScale: 6,
  weHaveATwoByTwo: 7,
  weHaveInstructions: 8,
  useMyMetrics: 9,
  overlapCompound: 10,
  scaledComponentOffset: 11,
  unscaledComponentOffset: 12,
})
