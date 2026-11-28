import type { Glyf } from '../types.js'

/**
 * Implemented by glyf tables read from a font. Given a glyph id, which
 * must be in range, returns the glyph's bytes as stored in the font, or
 * null if the glyph has been decoded (and so may have been edited).
 * Writers use it to copy glyphs that were never looked at instead of
 * re-encoding them.
 *
 * It lives in its own module so the writer can check for it without
 * pulling in the reader.
 */
export const storedGlyfBytes = Symbol('storedGlyfBytes')

export interface StoredGlyfSource {
  readonly numGlyphs: number
  get(id: number): Glyf
  [storedGlyfBytes](id: number): Uint8Array | null
}

export function isStoredGlyfSource(value: object): value is StoredGlyfSource {
  return storedGlyfBytes in value
}
