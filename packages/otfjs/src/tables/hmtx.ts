import { Reader, Writer } from '@otfjs/buffer'

import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { HheaTableReader } from './hhea.js'
import { MaxpTableReader } from './maxp.js'

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
  const size =
    table.longHorMetrics.length * 4 + table.leftSideBearings.length * 2
  const w = new Writer(size)

  for (const { advanceWidth, leftSideBearing } of table.longHorMetrics) {
    w.u16(advanceWidth)
    w.i16(leftSideBearing)
  }

  w.array('i16', table.leftSideBearings)

  return w.toBuffer()
}

export const HmtxTag = 'hmtx'

export const HmtxTableReader: TableReader<HmtxTable> = {
  tag: HmtxTag,
  read(view, font) {
    const { numberOfHMetrics } = font.readTable(HheaTableReader)
    const { numGlyphs } = font.readTable(MaxpTableReader)
    return readHmtxTable(view, numberOfHMetrics, numGlyphs)
  },
}

export const HmtxTableWriter: TableWriter<HmtxTable> = {
  tag: HmtxTag,
  write: writeHmtxTable,
}
