import { from2dot14, from16dot16 } from './bit.js'
import { fromLongDateTime } from './date.js'
import { asDataView } from './utils.js'

/**
 * Reads big-endian values from a range of bytes, advancing `offset` as it
 * goes.
 *
 * Readers made with `subtable` or `stream` share their parent's `DataView`
 * rather than allocating new typed arrays, so they're cheap to create.
 * Reads are still bounds-checked against the reader's own range.
 */
export class Reader {
  private readonly view: DataView
  /** Where this reader's range starts within `view`. */
  private readonly start: number

  /** The number of bytes in this reader's range. */
  public readonly length: number

  /** The current position, relative to the start of this reader's range. */
  public offset = 0

  constructor(data: Uint8Array)
  /** @internal Share `view`, reading `length` bytes from `start`. */
  constructor(view: DataView, start: number, length: number)
  constructor(data: Uint8Array | DataView, start?: number, length?: number) {
    // Tell the internal form apart by its arguments rather than with
    // `instanceof DataView`, which fails for views from another realm.
    if (start !== undefined && length !== undefined) {
      this.view = data as DataView
      this.start = start
      this.length = length
    } else {
      this.view = asDataView(data)
      this.start = 0
      this.length = data.byteLength
    }
  }

  /** This reader's bytes. Allocates a new `Uint8Array` view each call. */
  get data(): Uint8Array {
    return this.bytes(0, this.length)
  }

  public done(): boolean {
    return this.offset >= this.length
  }

  public u8(): number {
    return this.view.getUint8(this.advance(1))
  }

  public i8(): number {
    return this.view.getInt8(this.advance(1))
  }

  public u16(): number {
    return this.view.getUint16(this.advance(2))
  }

  public i16(): number {
    return this.view.getInt16(this.advance(2))
  }

  public u24(): number {
    const at = this.advance(3)
    return (this.view.getUint16(at) << 8) | this.view.getUint8(at + 2)
  }

  public u32(): number {
    return this.view.getUint32(this.advance(4))
  }

  public i32(): number {
    return this.view.getInt32(this.advance(4))
  }

  public i64(): bigint {
    return this.view.getBigInt64(this.advance(8))
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

  // woff2 specific https://www.w3.org/TR/WOFF2/#255UInt16-0
  public u16225(): number {
    const code = this.u8()

    if (code === 253) return this.u16()
    if (code === 255) return this.u8() + 253
    if (code === 254) return this.u8() + 253 * 2

    return code
  }

  // woff2 specific https://www.w3.org/TR/WOFF2/#UIntBase128-0
  public uBase128(): number {
    let accum = 0

    for (let i = 0; i < 5; ++i) {
      const byte = this.u8()

      // No leading 0's
      if (i === 0 && byte === 0x80) {
        throw new Error('UIntBase128 sequence has leading zeros')
      }

      // If any of top 7 bits are set then << 7 would overflow
      if (accum & 0xfe000000) {
        throw new Error('UIntBase128 sequence exceeds 5 bytes')
      }
      accum = (accum << 7) | (byte & 0x7f)

      // Spin until most significant bit of data byte is false
      if ((byte & 0x80) === 0) return accum
    }

    throw new Error('UIntBase128 sequence exceeds 5 bytes')
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
    const arr = new Array<T>(length)
    for (let i = 0; i < length; ++i) {
      arr[i] = fn(this)
    }
    return arr
  }

  public u8Array(length: number): Uint8Array {
    const arr = this.bytes(this.offset, length)
    this.offset += length
    return arr
  }

  // TODO: figure out how to make it clear why we have 3 separate but similar methods

  public dataview(
    offset = this.offset,
    length = this.length - this.offset,
  ): DataView {
    this.checkRange(offset, length)
    const { buffer, byteOffset } = this.view
    return new DataView(buffer, byteOffset + this.start + offset, length)
  }

  /**
   * A new reader over `length` bytes starting at `offset`, which is relative
   * to the start of this reader. Without a length, it runs to the end of
   * this reader.
   */
  public subtable(offset: number, length = this.length - offset): Reader {
    this.checkRange(offset, length)
    return new Reader(this.view, this.start + offset, length)
  }

  public stream(length: number): Reader {
    const reader = this.subtable(this.offset, length)
    this.offset += length
    return reader
  }

  /**
   * Advance past `size` bytes, returning the absolute position in `view`
   * they start at. Throws a RangeError if they run past the end of this
   * reader.
   */
  private advance(size: number): number {
    const offset = this.offset
    this.checkRange(offset, size)
    this.offset = offset + size
    return this.start + offset
  }

  private bytes(offset: number, length: number): Uint8Array {
    this.checkRange(offset, length)
    const { buffer, byteOffset } = this.view
    return new Uint8Array(buffer, byteOffset + this.start + offset, length)
  }

  private checkRange(offset: number, length: number) {
    if (offset < 0 || length < 0 || offset + length > this.length) {
      throw new RangeError(
        `Range ${offset} + ${length} is outside the bounds of a ${this.length} byte reader`,
      )
    }
  }
}
