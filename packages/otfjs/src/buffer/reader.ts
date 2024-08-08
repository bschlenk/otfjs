import { from2dot14, from16dot16 } from '../utils/bit.js'
import { fromLongDateTime } from '../utils/date.js'

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

  public f16dot16(): number {
    const val = this.i32()
    return from16dot16(val)
  }

  public date(): Date {
    const val = this.i64()
    return fromLongDateTime(val)
  }

  public tag(): string {
    return String.fromCharCode(this.u8(), this.u8(), this.u8(), this.u8())
  }

  public skip(n: number): void {
    this.offset += n
  }

  /**
   * This is meant to be used to read arrays of structured data from the view.
   * It doesn't do any reading itself, instead expecting the callback to read
   * the data from the view.
   *
   * If you need a simple array of u8s, use the u8Array method instead as it
   * uses a view of this reader rather than making a copy.
   */
  public array<T>(length: number, fn: (view: Reader) => T): T[] {
    const arr = []
    for (let i = 0; i < length; i++) {
      arr.push(fn(this))
    }
    return arr
  }

  public u8Array(length: number): Uint8Array {
    const offset = this.view.byteOffset + this.offset
    const arr = new Uint8Array(this.data, offset, length)
    this.offset += length
    return arr
  }

  public dataview(
    offset = this.offset,
    length = this.view.byteLength - this.offset,
  ): DataView {
    return new DataView(this.view.buffer, this.view.byteOffset + offset, length)
  }

  public subtable(offset: number, length?: number): Reader {
    return new Reader(this.view.buffer, this.view.byteOffset + offset, length)
  }
}
