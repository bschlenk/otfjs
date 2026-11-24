import { Writer } from '@otfjs/buffer'

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
    writer.array('u32', offsets)
  }

  return writer.toBuffer()
}

export function determineIndexFormat(offsets: number[]): number {
  const needsU32 = offsets[offsets.length - 1] / 2 > 0xffff
  return needsU32 ? 1 : 0
}
