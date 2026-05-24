export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(msg)
}

export function getAlignPadding(length: number, align: number) {
  return (align - (length % align)) % align
}

export function computeChecksum(table: Uint8Array) {
  const view = asDataView(table)
  let checksum = 0
  let n = table.byteLength
  const remainder = n % 4
  n -= remainder
  for (let i = 0; i < n; i += 4) {
    checksum = (checksum + view.getUint32(i)) >>> 0
  }
  if (remainder) {
    const b = new Uint8Array(4)
    b.set(new Uint8Array(view.buffer, n, remainder))
    checksum = (checksum + new DataView(b.buffer).getUint32(0)) >>> 0
  }
  return checksum
}

export function asDataView(
  data: ArrayBufferLike | ArrayBufferView | DataView,
  offset = 0,
  length?: number,
): DataView {
  return ArrayBuffer.isView(data) ?
      new DataView(
        data.buffer,
        data.byteOffset + offset,
        length ?? data.byteLength,
      )
    : new DataView(data, offset, length)
}

export function asUint8Array(
  data: ArrayBufferLike | ArrayBufferView | DataView,
  offset = 0,
  length?: number,
): Uint8Array {
  return ArrayBuffer.isView(data) ?
      new Uint8Array(
        data.buffer,
        data.byteOffset + offset,
        length ?? data.byteLength,
      )
    : new Uint8Array(data, offset, length)
}
