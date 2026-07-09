// https://learn.microsoft.com/en-us/typography/opentype/spec/maxp

import { s } from '@otfjs/buffer-gen/schema'

export const MaxpTable = s.versioned('MaxpTable', s.u32(), {
  // CFF or CFF2 fonts only require numGlyphs
  [0x00005000]: s.struct('MaxpTable05', {
    numGlyphs: s.u16('Number of glyphs in the font'),
  }),

  // TrueType fonts
  [0x00010000]: s.struct('MaxpTable10', {
    numGlyphs: s.u16('Number of glyphs in the font'),
    maxPoints: s.u16('Maximum points in a non-composite glyph'),
    maxContours: s.u16('Maximum contours in a non-composite glyph'),
    maxCompositePoints: s.u16('Maximum points in a composite glyph'),
    maxCompositeContours: s.u16('Maximum contours in a composite glyph'),
    maxZones: s.u16(
      '1 if instructions do not use the twilight zone, 2 if they do',
    ),
    maxTwilightPoints: s.u16('Maximum points used in Z0'),
    maxStorage: s.u16('Number of Storage Area locations'),
    maxFunctionDefs: s.u16(
      'Number of FDEFs, equal to the highest function number + 1',
    ),
    maxInstructionDefs: s.u16('Number of IDEFs'),
    maxStackElements: s.u16('Maximum stack depth across all programs'),
    maxSizeOfInstructions: s.u16('Maximum byte count for glyph instructions'),
    maxComponentElements: s.u16(
      'Maximum number of components referenced at top level',
    ),
    maxComponentDepth: s.u16(
      'Maximum levels of recursion; 1 for simple components',
    ),
  }),
})
