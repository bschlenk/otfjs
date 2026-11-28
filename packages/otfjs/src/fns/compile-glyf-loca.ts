import { writeGlyfTableWithOffsets } from '../glyf/glyf.write.js'
import {
  type LocaFormat,
  locaFormatFor,
  writeLocaTable,
} from '../tables/loca.js'
import type { Glyf } from '../types.js'

export interface CompiledGlyfLoca {
  glyf: Uint8Array
  loca: Uint8Array
  /** The value `head.indexToLocFormat` must be set to. */
  indexToLocFormat: LocaFormat
}

/**
 * Write the glyf and loca tables together, so loca matches the glyf
 * table it indexes into. Each glyph is encoded once. Glyphs from a glyf
 * table read from a font that were never decoded are copied as stored.
 *
 * Uses the smallest loca format the offsets allow, unless `format` is
 * given. Either way, the head table must be written with the returned
 * `indexToLocFormat`.
 */
export function compileGlyfLoca(
  glyphs: Iterable<Glyf>,
  format?: LocaFormat,
): CompiledGlyfLoca {
  const { data, offsets } = writeGlyfTableWithOffsets(glyphs)
  const indexToLocFormat = format ?? locaFormatFor(offsets)
  return {
    glyf: data,
    loca: writeLocaTable(offsets, indexToLocFormat),
    indexToLocFormat,
  }
}
