export type u8 = number
export type i8 = number
export type u16 = number
export type i16 = number
export type u24 = number
export type u32 = number
export type i32 = number
export type i64 = bigint
export type f2dot14 = number
export type f16dot16 = number
export type tag = string

// woff2 specific https://www.w3.org/TR/WOFF2/#255UInt16-0
export type u16225 = number

// woff2 specific https://www.w3.org/TR/WOFF2/#UIntBase128-0
export type uBase128 = number

/**
 * Declare a field as having a constant value. The value can be omitted when
 * passing objects to the writer and it will automatically be filled in with
 * the constant value.
 */
export type Const<T, U extends T> = U
