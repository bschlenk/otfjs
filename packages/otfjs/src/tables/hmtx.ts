import { Reader } from '../buffer.js'

export interface HmtxTable {
  longHorMetric: { advanceWidth: number; lsb: number }[]
  leftSideBearings: number[]
}

export function readHmtxTable(
  view: Reader,
  numberOfHMetrics: number,
  numGlyphs: number,
) {
  const longHorMetric = view.array(numberOfHMetrics, () => ({
    advanceWidth: view.u16(),
    lsb: view.i16(),
  }))

  const leftSideBearings = view.array(numGlyphs - numberOfHMetrics, () =>
    view.i16(),
  )

  return { longHorMetric, leftSideBearings }
}
