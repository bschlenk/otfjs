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
