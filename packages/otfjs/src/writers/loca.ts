import { Writer } from '../buffer/writer.js'

export function writeLocaTable(
  offsets: number[],
  indexFormat: 0 | 1,
): Uint8Array {
  const writer = new Writer()

  if (indexFormat === 0) {
    for (const offset of offsets) {
      writer.u16(offset / 2)
    }
  } else {
    for (const offset of offsets) {
      writer.u32(offset)
    }
  }

  return writer.toBuffer()
}

export function determineIndexFormat(offsets: number[]): number {
  const needsU32 = offsets[offsets.length - 1] / 2 > 0xffff
  return needsU32 ? 1 : 0
}
