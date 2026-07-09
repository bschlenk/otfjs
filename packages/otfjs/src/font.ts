import { NameId, PlatformId } from './enums.js'
import { getGlyph } from './fns/get-glyph.js'
import { getGlyphByCodePoint } from './fns/get-glyph-by-code-point.js'
import { getGlyphIndex } from './fns/get-glyph-index.js'
import { getName } from './fns/get-name.js'
import { glyphs } from './fns/glyphs.js'
import { validate } from './fns/validate.js'
import { FontHandle } from './font-handle.js'
import type { GlyphEnriched } from './types.js'

export class Font extends FontHandle {
  public get unitsPerEm(): number {
    return this.getTable('head').unitsPerEm
  }

  public get numGlyphs(): number {
    return this.getTable('maxp').numGlyphs
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
