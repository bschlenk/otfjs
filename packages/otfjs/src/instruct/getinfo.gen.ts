// This file is auto-generated from src/instruct/schema/getinfo.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export interface GetinfoSelector {
  version: boolean
  rotation: boolean
  stretch: boolean
  variations: boolean
  verticalPhantom: boolean
  greyscale: boolean
}

export function decodeGetinfoSelector(v: number): GetinfoSelector {
  return {
    version: !!(v & (1 << 0)),
    rotation: !!(v & (1 << 1)),
    stretch: !!(v & (1 << 2)),
    variations: !!(v & (1 << 3)),
    verticalPhantom: !!(v & (1 << 4)),
    greyscale: !!(v & (1 << 5)),
  }
}

export function readGetinfoSelector(r: Reader): GetinfoSelector {
  return decodeGetinfoSelector(r.u32())
}

export function writeGetinfoSelector(d: GetinfoSelector): number {
  return (
    (d.version ? 1 << 0 : 0) |
    (d.rotation ? 1 << 1 : 0) |
    (d.stretch ? 1 << 2 : 0) |
    (d.variations ? 1 << 3 : 0) |
    (d.verticalPhantom ? 1 << 4 : 0) |
    (d.greyscale ? 1 << 5 : 0)
  )
}
