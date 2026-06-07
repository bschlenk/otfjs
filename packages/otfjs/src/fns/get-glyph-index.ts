import { PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'

export function getGlyphIndex(font: FontHandle, codePoint: number): number {
  const table = font.getTable('cmap')
  const encodingId = codePoint > 0xffff ? 10 : 1

  const record = table.encodingRecords.find(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    (r) => r.platformId === PlatformId.Windows && r.encodingId === encodingId,
  )

  if (!record) {
    console.error(
      `Encoding record not found for platformId = ${PlatformId.Windows}, encodingId = ${encodingId}`,
    )
    return 0
  }

  const s = record.subtable
  let i = 0
  while (s.endCodes[i] < codePoint) ++i

  if (s.startCodes[i] > codePoint) return 0

  if (s.idRangeOffsets[i] === 0) {
    return (codePoint + s.idDeltas[i]) & 0xffff
  }

  const glyphArrayIndex =
    s.idRangeOffsets[i] / 2 + (codePoint - s.startCodes[i]) + i - s.endCodes.length
  const glyphId = s.glyphIdArray[glyphArrayIndex]
  if (glyphId === 0) return 0
  return (glyphId + s.idDeltas[i]) & 0xffff
}
