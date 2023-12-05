export function computeChecksum(table: DataView) {
  let checksum = 0
  let o = 0
  while (o < table.byteLength) {
    checksum = (checksum + table.getUint32(o)) >>> 0
    o += 4
  }

  return checksum
}
