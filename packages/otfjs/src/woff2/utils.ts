import { asDataView } from '../buffer/utils.js'

// wOF2
export const WOFF2_SIGNATURE = 0x774f4632

export function isWoff2(buffer: Uint8Array): boolean {
  if (buffer.byteLength < 4) return false

  const view = asDataView(buffer)
  return view.getUint32(0) === WOFF2_SIGNATURE
}
