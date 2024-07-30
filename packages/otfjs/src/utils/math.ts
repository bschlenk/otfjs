export function symmetricRound(n: number) {
  return Math.sign(n) * Math.round(Math.abs(n))
}

export function symmetricFloor(n: number) {
  return Math.sign(n) * Math.floor(Math.abs(n))
}

export function symmetricCeil(n: number) {
  return Math.sign(n) * Math.ceil(Math.abs(n))
}
