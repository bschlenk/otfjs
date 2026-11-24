// https://learn.microsoft.com/en-us/typography/opentype/spec/loca

import { Reader, Writer } from '@otfjs/buffer'

import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { assert } from '../utils/utils.js'
import { HeadTableReader } from './head.js'
import { MaxpTableReader } from './maxp.js'

/** Byte offsets into the glyf table, one per glyph plus a final end offset. */
export type LocaTable = number[]

/** 0 for the short format (offsets / 2 as u16), 1 for the long format (u32). */
export type LocaFormat = 0 | 1

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

/**
 * The smallest format that can represent the given offsets. The short
 * format stores offsets / 2 as a u16, so it fits offsets up to 0x1fffe.
 *
 * It also needs every offset to be even. Offsets from `compileGlyfLoca`
 * always are, since it pads each glyph to 4 bytes, but offsets taken from
 * an existing long-format font may not be.
 *
 * `head.indexToLocFormat` must match the format loca is written with.
 */
export function locaFormatFor(offsets: LocaTable): LocaFormat {
  const fitsShort = offsets.every((o) => o % 2 === 0 && o / 2 <= 0xffff)
  return fitsShort ? 0 : 1
}

export function writeLocaTable(
  offsets: LocaTable,
  format: LocaFormat = locaFormatFor(offsets),
): Uint8Array {
  const w = new Writer(offsets.length * (format === 0 ? 2 : 4))

  if (format === 0) {
    assert(locaFormatFor(offsets) === 0, 'offsets do not fit the short format')
    for (const offset of offsets) w.u16(offset / 2)
  } else {
    w.array('u32', offsets)
  }

  return w.toBuffer()
}

export const LocaTag = 'loca'

export const LocaTableReader: TableReader<LocaTable> = {
  tag: LocaTag,
  read(view, font) {
    const { indexToLocFormat } = font.readTable(HeadTableReader)
    const { numGlyphs } = font.readTable(MaxpTableReader)
    return readLocaTable(view, indexToLocFormat, numGlyphs)
  },
}

/**
 * Writes the smallest format the offsets allow; see `locaFormatFor`. Use
 * `writeLocaTable` to force a specific format.
 */
export const LocaTableWriter: TableWriter<LocaTable> = {
  tag: LocaTag,
  write: (offsets) => writeLocaTable(offsets),
}
