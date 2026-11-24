// This file is auto-generated from src/instruct/schema/getinfo.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export class GetinfoSelector {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get version(): boolean {
    return (this.value & 0x1) !== 0
  }

  set version(on: boolean) {
    this.value = (on ? this.value | 0x1 : this.value & ~0x1) >>> 0
  }

  get rotation(): boolean {
    return (this.value & 0x2) !== 0
  }

  set rotation(on: boolean) {
    this.value = (on ? this.value | 0x2 : this.value & ~0x2) >>> 0
  }

  get stretch(): boolean {
    return (this.value & 0x4) !== 0
  }

  set stretch(on: boolean) {
    this.value = (on ? this.value | 0x4 : this.value & ~0x4) >>> 0
  }

  get variations(): boolean {
    return (this.value & 0x8) !== 0
  }

  set variations(on: boolean) {
    this.value = (on ? this.value | 0x8 : this.value & ~0x8) >>> 0
  }

  get verticalPhantom(): boolean {
    return (this.value & 0x10) !== 0
  }

  set verticalPhantom(on: boolean) {
    this.value = (on ? this.value | 0x10 : this.value & ~0x10) >>> 0
  }

  get greyscale(): boolean {
    return (this.value & 0x20) !== 0
  }

  set greyscale(on: boolean) {
    this.value = (on ? this.value | 0x20 : this.value & ~0x20) >>> 0
  }

  toJSON() {
    return {
      value: this.value,
      version: this.version,
      rotation: this.rotation,
      stretch: this.stretch,
      variations: this.variations,
      verticalPhantom: this.verticalPhantom,
      greyscale: this.greyscale,
    }
  }
}

export function readGetinfoSelector(r: Reader): GetinfoSelector {
  return new GetinfoSelector(r.u32())
}
