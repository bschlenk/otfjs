// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import type { Reader } from '@otfjs/buffer'

import { LazyGlyfTable } from '../glyf/glyf.table.js'
import { writeGlyfTable } from '../glyf/glyf.write.js'
import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import type { Glyf } from '../types.js'
import { type LocaTable, LocaTableReader } from './loca.js'

export { readGlyf } from '../glyf/glyf.read.js'
export * from '../glyf/glyf.utils.js'
export * from '../glyf/glyf.write.js'
export type { GlyfCompositeFlags } from './glyf.gen.js'

/**
 * Every glyph in the font, in glyph id order, with composite glyphs left
 * as references to their components.
 *
 * The table read from a font decodes each glyph the first time `get` asks
 * for it, and returns that same object after. Iterating decodes every
 * glyph. For a glyph with its metrics and composites flattened, use
 * `getGlyph`.
 */
export interface GlyfTable extends Iterable<Glyf> {
  readonly numGlyphs: number
  get(id: number): Glyf
}

/**
 * Read the glyf table lazily. `loca` holds each glyph's offset into
 * `view`, plus a final end offset.
 */
export function readGlyfTable(view: Reader, loca: LocaTable): GlyfTable {
  return new LazyGlyfTable(view, loca)
}

export const GlyfTag = 'glyf'

export const GlyfTableReader: TableReader<GlyfTable> = {
  tag: GlyfTag,
  read: (view, font) => readGlyfTable(view, font.readTable(LocaTableReader)),
}

/**
 * Writes only the glyf table; loca must be rebuilt to match. See
 * `compileGlyfLoca`.
 *
 * Takes any glyphs in glyph id order: an array, or a `GlyfTable` read from
 * a font. From a table read from a font, glyphs that were never decoded
 * are copied as they were stored.
 */
export const GlyfTableWriter: TableWriter<Iterable<Glyf>> = {
  tag: GlyfTag,
  write: writeGlyfTable,
}
