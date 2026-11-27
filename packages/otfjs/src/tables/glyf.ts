// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { writeGlyfTable } from '../glyf/glyf.write.js'
import type { TableWriter } from '../table-writer.js'
import type { Glyf } from '../types.js'

export { readGlyf } from '../glyf/glyf.read.js'
export * from '../glyf/glyf.utils.js'
export * from '../glyf/glyf.write.js'
export type { GlyfCompositeFlags } from './glyf.gen.js'

/**
 * Every glyph in the font, in glyph id order, with composite glyphs left
 * as references to their components. This is what the glyf writers take.
 *
 * There's no glyf table reader yet: read glyphs one at a time with
 * `getGlyph`. A lazy, cached reader is planned.
 */
export type GlyfTable = Glyf[]

/** Read glyphs with `getGlyph`, which uses `FontHandle.getTableView(GlyfTag)`. */
export const GlyfTag = 'glyf'

/**
 * Writes only the glyf table; loca must be rebuilt to match. See
 * `compileGlyfLoca`.
 */
export const GlyfTableWriter: TableWriter<GlyfTable> = {
  tag: GlyfTag,
  write: writeGlyfTable,
}
