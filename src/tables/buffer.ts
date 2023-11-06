import { fromLongDateTime } from '../utils.js'

export class Reader {
  private view: DataView
  private offset: number = 0

  constructor(public readonly data: ArrayBuffer, offset = 0, length?: number) {
    this.view = new DataView(data, offset, length)
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
    const val = this.view.getUint32(this.offset) & 0xffffff
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

  public array<T>(length: number, fn: () => T): T[] {
    const arr = []
    for (let i = 0; i < length; i++) {
      arr.push(fn())
    }
    return arr
  }

  public subtable(offset: number, length?: number): Reader {
    return new Reader(this.view.buffer, this.view.byteOffset + offset, length)
  }
}
