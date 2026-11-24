/**
 * `Font` methods are one-line wrappers around the free functions in
 * `fns/`. Keep logic in those functions, not here.
 *
 * @module
 */

import { defaultReaders, type TableMap } from './default-readers.js'
import { NameId, PlatformId } from './enums.js'
import { getGlyph } from './fns/get-glyph.js'
import { getGlyphByCodePoint } from './fns/get-glyph-by-code-point.js'
import { getGlyphIndex } from './fns/get-glyph-index.js'
import { getName } from './fns/get-name.js'
import { getSampleText } from './fns/get-sample-text.js'
import { glyphs } from './fns/glyphs.js'
import { validate } from './fns/validate.js'
import { FontHandle } from './font-handle.js'
import type { TableReader } from './table-reader.js'
import { GlyfTag } from './tables/glyf.js'
import { HeadTableReader } from './tables/head.js'
import { MaxpTableReader } from './tables/maxp.js'
import type { GlyphEnriched } from './types.js'

export type TableType<T extends string> =
  T extends keyof TableMap ? TableMap[T] : unknown

/**
 * A `FontHandle` with convenience methods for common operations, plus
 * string-based table access via the built-in readers. Each method is also
 * available as a free function, like `getGlyph(font, id)`, which works on
 * a plain `FontHandle` and keeps bundles smaller.
 */
export class Font extends FontHandle {
  public get unitsPerEm(): number {
    return this.readTable(HeadTableReader).unitsPerEm
  }

  public get numGlyphs(): number {
    return this.readTable(MaxpTableReader).numGlyphs
  }

  /**
   * Read a table by tag using its built-in reader. Throws if the font
   * doesn't contain the table or there's no built-in reader for it.
   *
   * This pulls in every built-in reader. Prefer `readTable` with a
   * specific reader in code that cares about bundle size.
   */
  public getTable<T extends string>(tag: T): TableType<T> {
    const table = this.getTableOrNull(tag)
    if (table === null) throw new Error(`"${tag}" table not found`)
    return table
  }

  /**
   * Like `getTable`, but returns null if the font doesn't contain the
   * table.
   */
  public getTableOrNull<T extends string>(tag: T): TableType<T> | null {
    if (!this.hasTable(tag)) return null

    if (!Object.hasOwn(defaultReaders, tag)) {
      if (tag === GlyfTag) {
        throw new Error(
          'call getGlyph instead of reading the glyf table directly',
        )
      }
      throw new Error(`no built-in reader for the "${tag}" table`)
    }

    const reader = defaultReaders[tag as keyof TableMap] as TableReader<unknown>
    return this.readTable(reader) as TableType<T>
  }

  public getName(
    nameId: NameId,
    platformId: PlatformId = PlatformId.Windows,
  ): string | null {
    return getName(this, nameId, platformId)
  }

  public getGlyphIndex(codePoint: number): number {
    return getGlyphIndex(this, codePoint)
  }

  public getSampleText(): string {
    return getSampleText(this)
  }

  public getGlyph(id: number): GlyphEnriched {
    return getGlyph(this, id)
  }

  public getGlyphByCodePoint(codePoint: number): GlyphEnriched {
    return getGlyphByCodePoint(this, codePoint)
  }

  public *glyphs(): Generator<GlyphEnriched> {
    yield* glyphs(this)
  }

  public validate(): void {
    validate(this)
  }
}
