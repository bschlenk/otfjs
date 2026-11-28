import type { Reader } from '@otfjs/buffer'

import type { GlyfTable } from '../tables/glyf.js'
import type { LocaTable } from '../tables/loca.js'
import type { Glyf } from '../types.js'
import { assert } from '../utils/utils.js'
import { readGlyf } from './glyf.read.js'
import { storedGlyfBytes } from './glyf.stored.js'

/**
 * A glyf table that decodes each glyph the first time it's asked for, and
 * caches it. Glyphs are found through the loca offsets.
 */
export class LazyGlyfTable implements GlyfTable {
  readonly numGlyphs: number
  readonly #view: Reader
  readonly #loca: LocaTable
  readonly #glyphs: (Glyf | undefined)[]

  constructor(view: Reader, loca: LocaTable) {
    this.numGlyphs = loca.length - 1
    this.#view = view
    this.#loca = loca
    this.#glyphs = new Array<Glyf | undefined>(this.numGlyphs)
  }

  get(id: number): Glyf {
    assert(
      Number.isInteger(id) && id >= 0 && id < this.numGlyphs,
      `Glyph id ${id} is out of range; the font has ${this.numGlyphs} glyphs`,
    )
    return this.#decode(id)
  }

  *[Symbol.iterator](): Iterator<Glyf> {
    for (let id = 0; id < this.numGlyphs; ++id) yield this.#decode(id)
  }

  /** Only the glyf writer calls this, with ids it knows are in range. */
  [storedGlyfBytes](id: number): Uint8Array | null {
    if (this.#glyphs[id]) return null
    return this.#glyphView(id).u8Array(this.#loca[id + 1] - this.#loca[id])
  }

  #decode(id: number): Glyf {
    return (this.#glyphs[id] ??= readGlyf(this.#glyphView(id)))
  }

  #glyphView(id: number) {
    const offset = this.#loca[id]
    return this.#view.subtable(offset, this.#loca[id + 1] - offset)
  }
}
