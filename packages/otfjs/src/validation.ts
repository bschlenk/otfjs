import { Header, SfntVersion, TableRecord } from './types.js'
import { toHex } from './utils.js'

export function validateHeader(header: Header) {
  const errors: string[] = []
  const warnings: string[] = []

  if (
    header.sfntVersion !== SfntVersion.TRUE_TYPE_OUTLINES &&
    header.sfntVersion !== SfntVersion.CCF_DATA
  ) {
    errors.push(`invalid sfntVersion: ${toHex(header.sfntVersion)}`)
  }

  const expectedSearchRange = 2 ** Math.floor(Math.log2(header.numTables)) * 16
  if (header.searchRange !== expectedSearchRange) {
    warnings.push(
      `unexpected searchRange: ${header.searchRange} (expected ${expectedSearchRange})`,
    )
  }

  const expectedEntrySelector = Math.floor(Math.log2(header.numTables))
  if (header.entrySelector !== expectedEntrySelector) {
    warnings.push(
      `unexpected entrySelector: ${header.entrySelector} (expected ${expectedEntrySelector})`,
    )
  }

  const expectedRangeShift = header.numTables * 16 - expectedSearchRange
  if (header.rangeShift !== expectedRangeShift) {
    warnings.push(
      `unexpected rangeShift: ${header.rangeShift} (expected ${expectedRangeShift})`,
    )
  }

  if (errors.length) {
    throw new Error(`invalid open type font header:\n${errors.join('\n')}`)
  }

  if (warnings.length) {
    console.warn(`unexpected open type font header:\n${warnings.join('\n')}`)
  }
}

export function validateTable(data: Uint8Array, table: TableRecord) {
  const padding = table.length % 4
  const length = table.length + (padding ? 4 - padding : 0)
  const view = new DataView(data.buffer, table.offset, length)

  let checksum = 0
  let o = 0
  while (o < view.byteLength) {
    checksum += view.getUint32(o)
    o += 4
  }

  // TODO: why doesn't this work?
  if (checksum !== table.checksum) {
    throw new Error(
      `invalid checksum for table ${table.tag}: ${toHex(
        checksum,
      )} (expected ${toHex(table.checksum)})`,
    )
  }
}
