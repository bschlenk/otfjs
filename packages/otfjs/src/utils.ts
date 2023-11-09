const SECONDS_BETWEEN_1904_AND_1970 = 2_082_844_800n

export function toHex(n: number) {
  return `0x${n.toString(16).padStart(8, '0')}`
}

export function fromLongDateTime(val: bigint) {
  const epochTimestamp = Number(val - SECONDS_BETWEEN_1904_AND_1970)
  return new Date(epochTimestamp * 1000)
}

export function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    throw new Error(msg)
  }
}
