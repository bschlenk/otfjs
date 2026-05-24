import { Reader, Writer } from '@otfjs/buffer'

export interface LongHorMetric {
  advanceWidth: number
  leftSideBearing: number
}

export interface HmtxTable {
  longHorMetrics: LongHorMetric[]
  leftSideBearings: number[]
}

export function readHmtxTable(
  view: Reader,
  numberOfHMetrics: number,
  numGlyphs: number,
): HmtxTable {
  const longHorMetrics = view.array(numberOfHMetrics, () => ({
    advanceWidth: view.u16(),
    leftSideBearing: view.i16(),
  }))

  const leftSideBearings = view.array(numGlyphs - numberOfHMetrics, () =>
    view.i16(),
  )

  return { longHorMetrics, leftSideBearings }
}

export function writeHmtxTable(table: HmtxTable): Uint8Array {
  const size = table.longHorMetrics.length * 4 + table.leftSideBearings.length * 2
  const w = new Writer(size)

  for (const { advanceWidth, leftSideBearing } of table.longHorMetrics) {
    w.u16(advanceWidth)
    w.i16(leftSideBearing)
  }

  for (const lsb of table.leftSideBearings) {
    w.i16(lsb)
  }

  return w.toBuffer()
}
