import { PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'
import {
  type CmapTable,
  CmapTableReader,
  type EncodingRecord,
  lookupCmapSubtable,
} from '../tables/cmap.js'

/**
 * Which cmap subtable to look code points up in, best first. This is the
 * order HarfBuzz uses (`find_best_subtable` in `hb-ot-cmap-table.hh`):
 *
 * - The Windows symbol subtable first, if the font has one, since a font
 *   with one is a symbol font (harfbuzz/harfbuzz#1918).
 * - Then Unicode subtables, full-repertoire ones (format 12) before BMP-only
 *   ones (format 4). Fonts with both map the BMP identically in each, so the
 *   full-repertoire one only adds code points above U+FFFF.
 *
 * HarfBuzz also tries (0, 6), which is always format 13 (many-to-one, for
 * last-resort fonts), and the Mac Roman subtable last; we don't parse those
 * formats yet. Unlike HarfBuzz, a listed subtable in a format we don't parse
 * is skipped in favor of the next one.
 */
const SUBTABLES: [PlatformId, number][] = [
  [PlatformId.Windows, 0], // Symbol
  [PlatformId.Windows, 10], // Unicode, full repertoire
  [PlatformId.Unicode, 4], // Unicode 2.0+, full repertoire
  [PlatformId.Windows, 1], // Unicode BMP
  [PlatformId.Unicode, 3], // Unicode 2.0+ BMP
  [PlatformId.Unicode, 2], // ISO/IEC 10646 (deprecated)
  [PlatformId.Unicode, 1], // Unicode 1.1 (deprecated)
  [PlatformId.Unicode, 0], // Unicode 1.0 (deprecated)
]

/**
 * The glyph the font maps `codePoint` to, or 0 (`.notdef`, the font's
 * missing-glyph box) if it doesn't map it.
 */
export function getGlyphIndex(font: FontHandle, codePoint: number): number {
  const table = font.readTable(CmapTableReader)
  const record = findRecord(table)
  if (!record) return 0

  const glyphId = lookupCmapSubtable(record.subtable, codePoint)
  if (glyphId || !isSymbol(record) || codePoint > 0xff) return glyphId

  // Symbol fonts (e.g. Wingdings) map their characters into U+F020..F0FF,
  // but text set in them uses U+0020..00FF, so try both, as HarfBuzz and
  // Windows do.
  return lookupCmapSubtable(record.subtable, 0xf000 + codePoint)
}

/**
 * The encoding record of the subtable to use: the first in `SUBTABLES` order
 * that the font has, in a format with a code point to glyph lookup.
 */
function findRecord(table: CmapTable): EncodingRecord | undefined {
  for (const [platformId, encodingId] of SUBTABLES) {
    const record = table.encodingRecords.find(
      (r) =>
        r.platformId === platformId &&
        r.encodingId === encodingId &&
        // The only formats lookupCmapSubtable can read. Format 14 holds
        // variation sequences, not plain code points, so it never applies.
        (r.subtable.format === 4 || r.subtable.format === 12),
    )
    if (record) return record
  }
}

function isSymbol(record: EncodingRecord) {
  return record.platformId === PlatformId.Windows && record.encodingId === 0
}
