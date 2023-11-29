import { Header, SfntVersion, TableRecord } from './types.js'
import { getAlignPadding, toHex, trunc32 } from './utils.js'

export function validateHeader(header: Header) {
  const errors: string[] = []
  const warnings: string[] = []

  if (
    header.sfntVersion !== SfntVersion.TRUE_TYPE &&
    header.sfntVersion !== SfntVersion.OPEN_TYPE &&
    header.sfntVersion !== SfntVersion.APPLE_TRUE_TYPE &&
    header.sfntVersion !== SfntVersion.POST_SCRIPT
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

export function validateTable(data: ArrayBuffer, table: TableRecord) {
  const padding = getAlignPadding(table.length, 4)
  const length = table.length + padding
  const view = new DataView(data, table.offset, length)

  let checksum = 0
  let o = 0
  while (o < view.byteLength) {
    checksum += view.getUint32(o)
    o += 4
  }

  if (table.tag === 'head') {
    // head table checksum is calculated without the checksumAdjustment field
    checksum -= view.getUint32(8)
  }

  // checksum is a u32, so we need to truncate the value to 32 bits
  checksum = trunc32(checksum)

  if (checksum !== table.checksum) {
    throw new Error(
      `invalid checksum for table ${table.tag}: ${toHex(
        checksum,
      )} (expected ${toHex(table.checksum)})`,
    )
  }
}
