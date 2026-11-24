// https://learn.microsoft.com/en-us/typography/opentype/spec/glyf

import { writeGlyfTable } from '../glyph/glyph.write.js'
import type { TableWriter } from '../table-writer.js'
import type { Glyph } from '../types.js'

export * from '../glyph/glyph.read.js'
export * from '../glyph/glyph.utils.js'
export * from '../glyph/glyph.write.js'

/**
 * Every glyph in the font, in glyph id order, with composite glyphs left
 * as references to their components. This is what the glyf writers take.
 *
 * There's no glyf table reader yet: read glyphs one at a time with
 * `getGlyph`. A lazy, cached reader is planned.
 */
export type GlyfTable = Glyph[]

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
