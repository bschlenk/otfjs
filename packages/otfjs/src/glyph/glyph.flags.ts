// Internal: the per-point flag byte of a simple glyph's on-disk encoding.
// Shared by glyph.read.ts and glyph.write.ts; not part of the public API.

import { createFlagReader } from '../flags.js'

export const glyphFlags = createFlagReader({
  onCurvePoint: 0,
  xShortVector: 1,
  yShortVector: 2,
  repeat: 3,
  xIsSameOrPositiveXShortVector: 4,
  yIsSameOrPositiveYShortVector: 5,
  contoursOverlap: 6,
})

export type GlyphFlags = ReturnType<typeof glyphFlags>
