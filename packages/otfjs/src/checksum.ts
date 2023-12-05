export function computeChecksum(table: DataView, tableName: string) {
  let checksum = 0
  let o = 0
  while (o < table.byteLength) {
    checksum = (checksum + table.getUint32(o)) >>> 0
    o += 4
  }

  if (tableName === 'head') {
    // head table checksum is calculated without the checksumAdjustment field
    checksum = (checksum - table.getUint32(8)) >>> 0
  }

  return checksum
}
