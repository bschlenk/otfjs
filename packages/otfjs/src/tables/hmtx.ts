import { Reader } from '../buffer.js'

export interface HmtxTable {
  longHorMetrics: { advanceWidth: number; leftSideBearing: number }[]
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
