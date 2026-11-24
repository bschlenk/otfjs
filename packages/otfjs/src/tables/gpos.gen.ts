// This file is auto-generated from src/tables/schema/gpos.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export class LookupFlag {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get rightToLeft(): boolean {
    return (this.value & 0x1) !== 0
  }

  set rightToLeft(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get ignoreBaseGlyphs(): boolean {
    return (this.value & 0x2) !== 0
  }

  set ignoreBaseGlyphs(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get ignoreLigatures(): boolean {
    return (this.value & 0x4) !== 0
  }

  set ignoreLigatures(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get ignoreMarks(): boolean {
    return (this.value & 0x8) !== 0
  }

  set ignoreMarks(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get useMarkFilteringSet(): boolean {
    return (this.value & 0x10) !== 0
  }

  set useMarkFilteringSet(on: boolean) {
    this.value = on ? this.value | 0x10 : this.value & ~0x10
  }

  get markAttachmentTypeMask(): number {
    return (this.value >> 8) & 0xff
  }

  set markAttachmentTypeMask(n: number) {
    this.value = (this.value & ~(0xff << 8)) | ((n & 0xff) << 8)
  }

  toJSON() {
    return {
      value: this.value,
      rightToLeft: this.rightToLeft,
      ignoreBaseGlyphs: this.ignoreBaseGlyphs,
      ignoreLigatures: this.ignoreLigatures,
      ignoreMarks: this.ignoreMarks,
      useMarkFilteringSet: this.useMarkFilteringSet,
      markAttachmentTypeMask: this.markAttachmentTypeMask,
    }
  }
}

export function readLookupFlag(r: Reader): LookupFlag {
  return new LookupFlag(r.u16())
}

export class ValueFormat {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get xPlacement(): boolean {
    return (this.value & 0x1) !== 0
  }

  set xPlacement(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get yPlacement(): boolean {
    return (this.value & 0x2) !== 0
  }

  set yPlacement(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get xAdvance(): boolean {
    return (this.value & 0x4) !== 0
  }

  set xAdvance(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get yAdvance(): boolean {
    return (this.value & 0x8) !== 0
  }

  set yAdvance(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get xPlaDeviceOffset(): boolean {
    return (this.value & 0x10) !== 0
  }

  set xPlaDeviceOffset(on: boolean) {
    this.value = on ? this.value | 0x10 : this.value & ~0x10
  }

  get yPlaDeviceOffset(): boolean {
    return (this.value & 0x20) !== 0
  }

  set yPlaDeviceOffset(on: boolean) {
    this.value = on ? this.value | 0x20 : this.value & ~0x20
  }

  get xAdvDeviceOffset(): boolean {
    return (this.value & 0x40) !== 0
  }

  set xAdvDeviceOffset(on: boolean) {
    this.value = on ? this.value | 0x40 : this.value & ~0x40
  }

  get yAdvDeviceOffset(): boolean {
    return (this.value & 0x80) !== 0
  }

  set yAdvDeviceOffset(on: boolean) {
    this.value = on ? this.value | 0x80 : this.value & ~0x80
  }

  toJSON() {
    return {
      value: this.value,
      xPlacement: this.xPlacement,
      yPlacement: this.yPlacement,
      xAdvance: this.xAdvance,
      yAdvance: this.yAdvance,
      xPlaDeviceOffset: this.xPlaDeviceOffset,
      yPlaDeviceOffset: this.yPlaDeviceOffset,
      xAdvDeviceOffset: this.xAdvDeviceOffset,
      yAdvDeviceOffset: this.yAdvDeviceOffset,
    }
  }
}

export function readValueFormat(r: Reader): ValueFormat {
  return new ValueFormat(r.u16())
}
