import { type Reader } from '../buffer.js'

export function readTableAsU8Array(view: Reader) {
  return view.u8Array(view.length)
}
