// wOF2
export const WOFF2_SIGNATURE = 0x774f4632

export function isWoff2(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer)
  return view.getUint32(0) === WOFF2_SIGNATURE
}
