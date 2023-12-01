// https://learn.microsoft.com/en-us/typography/opentype/spec/maxp

import { Reader } from '../buffer.js'
import { assert, toHex } from '../utils.js'

export type MaxpTable = MaxpTable05 | MaxpTable10

export interface MaxpTable05 {
  version: 0x00005000
  numGlyphs: number
}

export interface MaxpTable10 {
  version: 0x00010000
  numGlyphs: number
  maxPoints: number
  maxContours: number
  maxCompositePoints: number
  maxCompositeContours: number
  maxZones: number
  maxTwilightPoints: number
  maxStorage: number
  maxFunctionDefs: number
  maxInstructionDefs: number
  maxStackElements: number
  maxSizeOfInstructions: number
  maxComponentElements: number
  maxComponentDepth: number
}

export function readMaxpTable(view: Reader): MaxpTable {
  const version = view.u32()
  const numGlyphs = view.u16()

  if (version === 0x00005000) {
    // CFF or CFF2 based outlines only require the numGlyphs field.
    return { version, numGlyphs }
  }

  assert(
    version === 0x00010000,
    `Unexpected maxp table version ${toHex(version)}`,
  )

  const maxPoints = view.u16()
  const maxContours = view.u16()
  const maxCompositePoints = view.u16()
  const maxCompositeContours = view.u16()
  const maxZones = view.u16()
  const maxTwilightPoints = view.u16()
  const maxStorage = view.u16()
  const maxFunctionDefs = view.u16()
  const maxInstructionDefs = view.u16()
  const maxStackElements = view.u16()
  const maxSizeOfInstructions = view.u16()
  const maxComponentElements = view.u16()
  const maxComponentDepth = view.u16()

  return {
    version,
    numGlyphs,
    maxPoints,
    maxContours,
    maxCompositePoints,
    maxCompositeContours,
    maxZones,
    maxTwilightPoints,
    maxStorage,
    maxFunctionDefs,
    maxInstructionDefs,
    maxStackElements,
    maxSizeOfInstructions,
    maxComponentElements,
    maxComponentDepth,
  }
}
