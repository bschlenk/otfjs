import { clamp } from './utils.js'

/**
 * Convert a number to a 2.14 fixed point value, returned as an unsigned 16 bit
 * integer. Values that round past the representable range are clamped.
 */
export function to2dot14(val: number) {
  // Clamp so rounding near the top of the range can't wrap to -2
  return clamp(Math.round(val * 16384), -0x8000, 0x7fff) & 0xffff
}

/**
 * Convert a 2.14 fixed point value to a number. Accepts either a signed or
 * unsigned 16 bit integer.
 */
export function from2dot14(val: number) {
  // Sign-extend the low 16 bits so this works for both i16 and u16 inputs
  return ((val << 16) >> 16) / 16384
}

/**
 * Convert a 16.16 fixed point value to a number. Accepts either a signed or
 * unsigned 32 bit integer.
 */
export function from16dot16(val: number) {
  return (val | 0) / 65536
}
