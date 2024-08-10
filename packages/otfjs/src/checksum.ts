export function computeChecksum(table: DataView) {
  let checksum = 0

  let n = table.byteLength
  const remainder = n % 4
  n -= remainder

  for (let i = 0; i < n; i += 4) {
    checksum = (checksum + table.getUint32(i)) >>> 0
  }

  if (remainder) {
    // Read the final u32 padded with zeros
    const b = new Uint8Array(4)
    const d = new DataView(b.buffer)
    b.set(new Uint8Array(table.buffer, n, remainder))
    checksum = (checksum + d.getUint32(0)) >>> 0
  }

  return checksum
}
