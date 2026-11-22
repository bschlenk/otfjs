// https://learn.microsoft.com/en-us/typography/opentype/spec/loca

import { Reader } from '@otfjs/buffer'

import { readerFor } from '../table-reader.js'
import { HeadTableReader } from './head.js'
import { MaxpTableReader } from './maxp.js'

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

export const LocaTag = 'loca'

export const LocaTableReader = readerFor<LocaTable>(LocaTag, (view, font) => {
  const { indexToLocFormat } = font.readTable(HeadTableReader)
  const { numGlyphs } = font.readTable(MaxpTableReader)
  return readLocaTable(view, indexToLocFormat, numGlyphs)
})
