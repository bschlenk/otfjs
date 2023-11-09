// https://learn.microsoft.com/en-us/typography/opentype/spec/loca

import { Reader } from './buffer.js'

// index 0 always points to the "missing character" glyph.

export function readLocaTable(
  view: Reader,
  indexToLocFormat: number,
  numGlyphs: number,
) {
  if (indexToLocFormat === 0) {
    // short version
    return view.array(numGlyphs + 1, () => view.u16() * 2)
  }

  // long version
  return view.array(numGlyphs + 1, () => view.u32())
}
