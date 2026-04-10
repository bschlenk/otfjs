export function from2dot14(val: number) {
  // force the 2 bit mantissa to be signed
  const mantissa = (val << 16) >> 30
  const fraction = (val & 0x3fff) / 16384
  return mantissa + fraction
}

export function from16dot16(val: number) {
  return (val | 0) / 65536
}
