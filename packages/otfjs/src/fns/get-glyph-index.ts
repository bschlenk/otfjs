import { PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'
import {
  type CmapSubtable,
  type CmapTable,
  CmapTableReader,
  lookupCmapSubtable,
} from '../tables/cmap.js'

/**
 * Unicode subtables to use, best first: full-repertoire ones before BMP-only
 * ones, as HarfBuzz and FreeType do.
 */
const UNICODE_SUBTABLES: [PlatformId, number][] = [
  [PlatformId.Windows, 10], // Unicode full repertoire
  [PlatformId.Unicode, 4], // Unicode 2.0+ full repertoire
  [PlatformId.Windows, 1], // Unicode BMP
  [PlatformId.Unicode, 3], // Unicode 2.0+ BMP
  [PlatformId.Unicode, 2], // ISO/IEC 10646 (deprecated)
  [PlatformId.Unicode, 1], // Unicode 1.1 (deprecated)
  [PlatformId.Unicode, 0], // Unicode 1.0 (deprecated)
]

const SYMBOL_SUBTABLES: [PlatformId, number][] = [[PlatformId.Windows, 0]]

/**
 * The glyph the font maps `codePoint` to, or 0 (`.notdef`, the font's
 * missing-glyph box) if it doesn't map it.
 */
export function getGlyphIndex(font: FontHandle, codePoint: number): number {
  const table = font.readTable(CmapTableReader)

  const unicode = findSubtable(table, UNICODE_SUBTABLES)
  if (unicode) return lookupCmapSubtable(unicode, codePoint)

  // Symbol fonts (e.g. Wingdings) map their characters into U+F020–F0FF, but
  // text set in them uses U+0020–00FF, so try both.
  const symbol = findSubtable(table, SYMBOL_SUBTABLES)
  if (symbol) {
    const glyphId = lookupCmapSubtable(symbol, codePoint)
    if (glyphId !== 0 || codePoint > 0xff) return glyphId
    return lookupCmapSubtable(symbol, 0xf000 + codePoint)
  }

  return 0
}

/** The first subtable in `preferred` order that's in a format we can read. */
function findSubtable(
  table: CmapTable,
  preferred: [PlatformId, number][],
): CmapSubtable | undefined {
  for (const [platformId, encodingId] of preferred) {
    const record = table.encodingRecords.find(
      (r) =>
        r.platformId === platformId &&
        r.encodingId === encodingId &&
        (r.subtable.format === 4 || r.subtable.format === 12),
    )
    if (record) return record.subtable
  }
}
