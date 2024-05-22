import { from2dot14, to2dot14 } from './bit.js'
import { computeChecksum } from './checksum.js'
import {
  assert,
  fromLongDateTime,
  getAlignPadding,
  toLongDateTime,
} from './utils.js'

export class Reader {
  private view: DataView
  public offset: number = 0

  constructor(
    public readonly data: ArrayBuffer,
    offset = 0,
    length?: number,
  ) {
    this.view = new DataView(data, offset, length)
  }

  get length(): number {
    return this.view.byteLength
  }

  public u8(): number {
    const val = this.view.getUint8(this.offset)
    this.offset += 1
    return val
  }

  public i8(): number {
    const val = this.view.getInt8(this.offset)
    this.offset += 1
    return val
  }

  public u16(): number {
    const val = this.view.getUint16(this.offset)
    this.offset += 2
    return val
  }

  public i16(): number {
    const val = this.view.getInt16(this.offset)
    this.offset += 2
    return val
  }

  public u24(): number {
    const val = this.view.getUint32(this.offset) >> 8
    this.offset += 3
    return val
  }

  public u32(): number {
    const val = this.view.getUint32(this.offset)
    this.offset += 4
    return val
  }

  public i32(): number {
    const val = this.view.getInt32(this.offset)
    this.offset += 4
    return val
  }

  public i64(): bigint {
    const val = this.view.getBigInt64(this.offset)
    this.offset += 8
    return val
  }

  public f2dot14(): number {
    const val = this.i16()
    return from2dot14(val)
  }

  public date(): Date {
    const val = this.i64()
    return fromLongDateTime(val)
  }

  public tag(): string {
    const o = this.offset
    this.offset += 4
    return String.fromCharCode(
      this.view.getUint8(o),
      this.view.getUint8(o + 1),
      this.view.getUint8(o + 2),
      this.view.getUint8(o + 3),
    )
  }

  public skip(n: number): void {
    this.offset += n
  }

  /**
   * This is meant to be used to read arrays of structured data from the view. It doesn't do any
   * reading itself, and instead expects the callback to read the data from the view. If you need
   * a simple array of u8s, use the u8Array method instead.
   */
  public array<T>(length: number, fn: () => T): T[] {
    const arr = []
    for (let i = 0; i < length; i++) {
      arr.push(fn())
    }
    return arr
  }

  public u8Array(length: number): Uint8Array {
    const arr = new Uint8Array(
      this.data,
      this.view.byteOffset + this.offset,
      length,
    )
    this.offset += length
    return arr
  }

  public dataview(offset?: number, length?: number): DataView {
    if (offset == null) {
      return new DataView(
        this.view.buffer,
        this.view.byteOffset + this.offset,
        this.view.byteLength - this.offset,
      )
    }
    return new DataView(this.view.buffer, this.view.byteOffset + offset, length)
  }

  public subtable(offset: number, length?: number): Reader {
    return new Reader(this.view.buffer, this.view.byteOffset + offset, length)
  }
}

export class Writer {
  public data: ArrayBuffer
  public view: DataView
  public offset: number = 0
  private maxOffset: number = 0

  constructor(data?: ArrayBuffer) {
    this.data = data ?? new ArrayBuffer(1024)
    this.view = new DataView(this.data)
  }

  get length(): number {
    return Math.max(this.offset, this.maxOffset)
  }

  get capacity(): number {
    return this.data.byteLength
  }

  public u8(val: number) {
    this.maybeResize(1)
    this.view.setUint8(this.offset, val)
    this.offset += 1
  }

  public i8(val: number) {
    this.maybeResize(1)
    this.view.setInt8(this.offset, val)
    this.offset += 1
  }

  public u16(val: number) {
    this.maybeResize(2)
    this.view.setUint16(this.offset, val)
    this.offset += 2
  }

  public i16(val: number) {
    this.maybeResize(2)
    this.view.setInt16(this.offset, val)
    this.offset += 2
  }

  public u24(val: number) {
    this.maybeResize(3)
    const buff = new ArrayBuffer(4)
    new DataView(buff).setUint32(0, val)
    const arr = new Uint8Array(buff)
    this.view.setUint8(this.offset, arr[1])
    this.view.setUint8(this.offset + 1, arr[2])
    this.view.setUint8(this.offset + 2, arr[3])
    this.offset += 3
  }

  public u32(val: number) {
    this.maybeResize(4)
    this.view.setUint32(this.offset, val)
    this.offset += 4
  }

  public i32(val: number) {
    this.maybeResize(4)
    this.view.setInt32(this.offset, val)
    this.offset += 4
  }

  public i64(val: bigint) {
    this.maybeResize(8)
    this.view.setBigInt64(this.offset, val)
    this.offset += 8
  }

  public f2dot14(val: number) {
    assert(val >= -2 && val < 2, 'f2dot14 must be between -2 and 2')
    this.u16(to2dot14(val))
  }

  public date(date: Date) {
    this.i64(toLongDateTime(date))
  }

  public tag(val: string) {
    assert(val.length === 4, 'Tag must be 4 characters long')
    this.maybeResize(4)
    this.view.setUint8(this.offset, val.charCodeAt(0))
    this.view.setUint8(this.offset + 1, val.charCodeAt(1))
    this.view.setUint8(this.offset + 2, val.charCodeAt(2))
    this.view.setUint8(this.offset + 3, val.charCodeAt(3))
    this.offset += 4
  }

  public utf16(val: string) {
    for (let i = 0, n = val.length; i < n; ++i) {
      this.u16(val.charCodeAt(i))
    }
  }

  public skip(n: number): void {
    this.maybeResize(n)
    this.offset += n
  }

  public buffer(val: Writer | ArrayBuffer, align = 0) {
    let size = 0
    if (val instanceof Writer) {
      size = val.length
      val = val.data
    } else {
      size = val.byteLength
    }

    this.maybeResize(size)
    new Uint8Array(this.data).set(new Uint8Array(val, 0, size), this.offset)
    this.offset += size

    if (align) {
      const padding = getAlignPadding(this.offset, align)
      this.offset += padding
    }
  }

  public at(offset: number, fn: (writer: Writer) => void) {
    const writer = new Writer(this.data)
    writer.offset = offset
    fn(writer)
    this.maxOffset = Math.max(this.maxOffset, writer.length)
    return writer.length - offset
  }

  public checksum() {
    return computeChecksum(new DataView(this.data, 0, this.length))
  }

  private maybeResize(n: number) {
    let size = this.capacity
    if (this.offset + n <= size) return

    while (this.offset + n > size) {
      size *= 2
    }

    const newBuffer = new ArrayBuffer(size)
    new Uint8Array(newBuffer).set(new Uint8Array(this.data))
    this.data = newBuffer
    this.view = new DataView(this.data)
  }
}
