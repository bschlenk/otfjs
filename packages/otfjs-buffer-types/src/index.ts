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

/**
 * Declare a field as an array whose length is determined by another field in
 * the same struct. The CountField string must match the name of a preceding
 * field of a numeric type.
 *
 * TypeScript cannot enforce the CountField constraint inline (self-referential
 * interfaces are not allowed), but you can validate an interface after the
 * fact with ValidateSchema<T>.
 *
 * At the type level this is just T[], so existing code that works with arrays
 * is unaffected.
 */
export type Array<T, CountField extends string = string> = T[]

/**
 * Validate that all Array count fields in an interface reference an existing
 * field. Resolves to T if valid, never if not.
 *
 * Usage:
 *   interface HmtxTable {
 *     numberOfHMetrics: t.u16
 *     longHorMetrics: t.Array<LongHorMetric, 'numberOfHMetrics'>
 *   }
 *   type _ = t.ValidateSchema<HmtxTable>  // type error if any count field is wrong
 */
export type ValidateSchema<T> = {
  [K in keyof T]: T[K] extends Array<any, infer CountField>
    ? CountField extends keyof T
      ? T[K]
      : `Error: '${string & CountField}' referenced in Array<T, CountField> is not a field of this interface`
    : T[K]
} extends T
  ? T
  : never
