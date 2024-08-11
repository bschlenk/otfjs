import { computeChecksum } from '../checksum.js'
import { to2dot14 } from '../utils/bit.js'
import { toLongDateTime } from '../utils/date.js'
import { assert, getAlignPadding } from '../utils/utils.js'

export class Writer {
  public data: ArrayBuffer
  public view: DataView
  public offset: number = 0
  private maxOffset: number = 0

  constructor(size: number = 1024) {
    this.data = new ArrayBuffer(size)
    this.view = new DataView(this.data)
  }

  get length(): number {
    return Math.max(this.offset, this.maxOffset)
  }

  // alias for length, to be compatible with ArrayBuffer
  get byteLength(): number {
    return this.length
  }

  get capacity(): number {
    return this.data.byteLength
  }

  public toBuffer(): Uint8Array {
    return new Uint8Array(this.data, 0, this.length)
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
    // do this first to avoid potentially resizing more than once
    this.maybeResize(4)
    this.u8(val.charCodeAt(0))
    this.u8(val.charCodeAt(1))
    this.u8(val.charCodeAt(2))
    this.u8(val.charCodeAt(3))
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

  public pad(n: number): void {
    const p = getAlignPadding(this.length, n)
    if (p) this.skip(p)
  }

  public buffer(val: Writer | ArrayBuffer, align = 0) {
    const buff = val instanceof Writer ? val.toBuffer() : new Uint8Array(val)
    let length = buff.byteLength
    if (length === 0) return

    length += align ? getAlignPadding(this.offset + length, align) : 0

    this.maybeResize(length)
    new Uint8Array(this.data).set(buff, this.offset)
    this.offset += length
  }

  public at(offset: number, fn: (writer: Writer) => void) {
    const oldOffset = this.offset
    this.offset = offset

    fn(this)

    const newOffset = this.offset
    this.maxOffset = this.length
    this.offset = oldOffset

    return newOffset - offset
  }

  public checksum() {
    return computeChecksum(new Uint8Array(this.data))
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
