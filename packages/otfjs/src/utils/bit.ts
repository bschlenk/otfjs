export function to26dot6(val: number) {
  return (val * 64) | 0
}

export function from26dot6(val: number) {
  return (val | 0) / 64
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
