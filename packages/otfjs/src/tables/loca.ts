// https://learn.microsoft.com/en-us/typography/opentype/spec/loca

import { Reader } from './buffer.js'

export type LocaTable = number[]

export function readLocaTable(
  view: Reader,
  indexToLocFormat: number,
  numGlyphs: number,
): LocaTable {
  if (indexToLocFormat === 0) {
    // short version
    return view.array(numGlyphs + 1, () => view.u16() * 2)
  }

  // long version
  return view.array(numGlyphs + 1, () => view.u32())
}
