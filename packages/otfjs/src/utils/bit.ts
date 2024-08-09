export function to26dot6(val: number) {
  const mantissa = Math.floor(val)
  const fraction = (val - mantissa) * 64
  return ((mantissa << 6) | fraction) >>> 0
}

export function from26dot6(val: number) {
  return (val | 0) / 64
}

export function to2dot14(val: number) {
  const mantissa = Math.floor(val)
  const fraction = Math.round((val - mantissa) * 16384)
  return ((mantissa << 14) | fraction) & 0xffff
}

export function from2dot14(val: number) {
  // force the 2 bit mantissa to be signed
  const mantissa = (val << 16) >> 30
  const fraction = (val & 0x3fff) / 16384
  return mantissa + fraction
}

export function from16dot16(val: number) {
  return (val | 0) / 65536
}

export function readBit(buff: Uint8Array, offset: number): boolean {
  const byte = buff[offset >>> 3]
  const bit = 7 - (offset & 7)
  return Boolean((byte >>> bit) & 1)
}

export function highNibble(byte: number) {
  return byte >>> 4
}

export function lowNibble(byte: number) {
  return byte & 15
}

export function high12(byte: number) {
  return (byte >>> 12) & 0xfff
}

export function low12(byte: number) {
  return byte & 0xfff
}
