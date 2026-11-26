// This file is auto-generated from src/tables/schema/glyf.ts.
// Run `pnpm generate` to regenerate. Do not edit manually.
import { type Reader } from '@otfjs/buffer'

export class GlyfCompositeFlags {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get arg1And2AreWords(): boolean {
    return (this.value & 0x1) !== 0
  }

  set arg1And2AreWords(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get argsAreXYValues(): boolean {
    return (this.value & 0x2) !== 0
  }

  set argsAreXYValues(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get roundXYToGrid(): boolean {
    return (this.value & 0x4) !== 0
  }

  set roundXYToGrid(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get weHaveAScale(): boolean {
    return (this.value & 0x8) !== 0
  }

  set weHaveAScale(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get moreComponents(): boolean {
    return (this.value & 0x20) !== 0
  }

  set moreComponents(on: boolean) {
    this.value = on ? this.value | 0x20 : this.value & ~0x20
  }

  get weHaveAnXAndYScale(): boolean {
    return (this.value & 0x40) !== 0
  }

  set weHaveAnXAndYScale(on: boolean) {
    this.value = on ? this.value | 0x40 : this.value & ~0x40
  }

  get weHaveATwoByTwo(): boolean {
    return (this.value & 0x80) !== 0
  }

  set weHaveATwoByTwo(on: boolean) {
    this.value = on ? this.value | 0x80 : this.value & ~0x80
  }

  get weHaveInstructions(): boolean {
    return (this.value & 0x100) !== 0
  }

  set weHaveInstructions(on: boolean) {
    this.value = on ? this.value | 0x100 : this.value & ~0x100
  }

  get useMyMetrics(): boolean {
    return (this.value & 0x200) !== 0
  }

  set useMyMetrics(on: boolean) {
    this.value = on ? this.value | 0x200 : this.value & ~0x200
  }

  get overlapCompound(): boolean {
    return (this.value & 0x400) !== 0
  }

  set overlapCompound(on: boolean) {
    this.value = on ? this.value | 0x400 : this.value & ~0x400
  }

  get scaledComponentOffset(): boolean {
    return (this.value & 0x800) !== 0
  }

  set scaledComponentOffset(on: boolean) {
    this.value = on ? this.value | 0x800 : this.value & ~0x800
  }

  get unscaledComponentOffset(): boolean {
    return (this.value & 0x1000) !== 0
  }

  set unscaledComponentOffset(on: boolean) {
    this.value = on ? this.value | 0x1000 : this.value & ~0x1000
  }

  toJSON() {
    return {
      value: this.value,
      arg1And2AreWords: this.arg1And2AreWords,
      argsAreXYValues: this.argsAreXYValues,
      roundXYToGrid: this.roundXYToGrid,
      weHaveAScale: this.weHaveAScale,
      moreComponents: this.moreComponents,
      weHaveAnXAndYScale: this.weHaveAnXAndYScale,
      weHaveATwoByTwo: this.weHaveATwoByTwo,
      weHaveInstructions: this.weHaveInstructions,
      useMyMetrics: this.useMyMetrics,
      overlapCompound: this.overlapCompound,
      scaledComponentOffset: this.scaledComponentOffset,
      unscaledComponentOffset: this.unscaledComponentOffset,
    }
  }
}

export function readGlyfCompositeFlags(r: Reader): GlyfCompositeFlags {
  return new GlyfCompositeFlags(r.u16())
}

export class GlyfFlags {
  value: number

  constructor(value = 0) {
    this.value = value
  }

  get onCurvePoint(): boolean {
    return (this.value & 0x1) !== 0
  }

  set onCurvePoint(on: boolean) {
    this.value = on ? this.value | 0x1 : this.value & ~0x1
  }

  get xShortVector(): boolean {
    return (this.value & 0x2) !== 0
  }

  set xShortVector(on: boolean) {
    this.value = on ? this.value | 0x2 : this.value & ~0x2
  }

  get yShortVector(): boolean {
    return (this.value & 0x4) !== 0
  }

  set yShortVector(on: boolean) {
    this.value = on ? this.value | 0x4 : this.value & ~0x4
  }

  get repeat(): boolean {
    return (this.value & 0x8) !== 0
  }

  set repeat(on: boolean) {
    this.value = on ? this.value | 0x8 : this.value & ~0x8
  }

  get xIsSameOrPositiveXShortVector(): boolean {
    return (this.value & 0x10) !== 0
  }

  set xIsSameOrPositiveXShortVector(on: boolean) {
    this.value = on ? this.value | 0x10 : this.value & ~0x10
  }

  get yIsSameOrPositiveYShortVector(): boolean {
    return (this.value & 0x20) !== 0
  }

  set yIsSameOrPositiveYShortVector(on: boolean) {
    this.value = on ? this.value | 0x20 : this.value & ~0x20
  }

  get contoursOverlap(): boolean {
    return (this.value & 0x40) !== 0
  }

  set contoursOverlap(on: boolean) {
    this.value = on ? this.value | 0x40 : this.value & ~0x40
  }

  toJSON() {
    return {
      value: this.value,
      onCurvePoint: this.onCurvePoint,
      xShortVector: this.xShortVector,
      yShortVector: this.yShortVector,
      repeat: this.repeat,
      xIsSameOrPositiveXShortVector: this.xIsSameOrPositiveXShortVector,
      yIsSameOrPositiveYShortVector: this.yIsSameOrPositiveYShortVector,
      contoursOverlap: this.contoursOverlap,
    }
  }
}

export function readGlyfFlags(r: Reader): GlyfFlags {
  return new GlyfFlags(r.u8())
}
