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
