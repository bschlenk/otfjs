import { asDataView } from '../utils/utils.js'

// wOF2
export const WOFF2_SIGNATURE = 0x774f4632

export function isWoff2(buffer: Uint8Array): boolean {
  const view = asDataView(buffer)
  return view.getUint32(0) === WOFF2_SIGNATURE
}
