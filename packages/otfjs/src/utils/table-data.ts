import { type Reader } from '@otfjs/buffer'

export function readTableAsU8Array(view: Reader) {
  return view.u8Array(view.length)
}

export function readTableAsI16Array(view: Reader) {
  return view.array(view.length / 2, () => view.i16())
}
