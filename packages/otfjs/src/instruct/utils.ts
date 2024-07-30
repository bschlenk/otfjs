import { createFlagReader } from '../flags.js'
import { assert } from '../utils/utils.js'
import { GraphicsState } from './graphics.js'
import { Opcode } from './opcode.js'

export const SQRT2_2 = Math.SQRT2 / 2

export const enum DistanceType {
  GRAY = 0,
  BLACK = 1,
  WHITE = 2,
}

export function asDistanceType(n: number) {
  assert(n < 3, `Invalid distance type ${n}`)
  return n
}

export const getinfoFlags = createFlagReader({
  version: 0,
  rotation: 1,
  stretch: 2,
  variations: 3,
  verticalPhantom: 4,
  greyscale: 5,
})

export function opcodeLength(inst: Uint8Array, pc: number) {
  const opcode = inst[pc]

  switch (opcode) {
    case Opcode.NPUSHB:
      // NPUSHB stores the number of bytes as the next instruction
      // + 2 for the opcode and the byte count
      return inst[pc + 1] + 2

    case Opcode.NPUSHW:
      // NPUSHW stores the number of words as the next instruction
      // + 2 for the opcode and the word count
      return inst[pc + 1] * 2 + 2

    case Opcode.PUSHB0:
    case Opcode.PUSHB1:
    case Opcode.PUSHB2:
    case Opcode.PUSHB3:
    case Opcode.PUSHB4:
    case Opcode.PUSHB5:
    case Opcode.PUSHB6:
    case Opcode.PUSHB7: {
      const n = (opcode & 0b111) + 1
      return 1 + n
    }

    case Opcode.PUSHW0:
    case Opcode.PUSHW1:
    case Opcode.PUSHW2:
    case Opcode.PUSHW3:
    case Opcode.PUSHW4:
    case Opcode.PUSHW5:
    case Opcode.PUSHW6:
    case Opcode.PUSHW7: {
      const n = (opcode & 0b111) + 1
      return 1 + n * 2
    }

    default:
      return 1
  }
}

export function viewFor(inst: Uint8Array) {
  return new DataView(inst.buffer, inst.byteOffset)
}

export function makeStore(size: number) {
  return new DataView(new ArrayBuffer(size * 4))
}

export function deltaValue(magnitude: number) {
  const val = magnitude - 8
  return val < 0 ? val : val + 1
}

export function customRoundState(
  value: number,
  gridPeriod: number,
): GraphicsState['roundStateCustom'] {
  let period = 0
  switch ((value >>> 6) & 0b11) {
    case 0:
      period = gridPeriod / 2
      break
    case 1:
      period = gridPeriod
      break
    case 2:
      period = gridPeriod * 2
      break
    case 3:
      assert(false, 'Unsupported roundState period 3')
  }

  let phase = 0
  switch ((value >>> 4) & 0b11) {
    case 1:
      phase = period / 4
      break
    case 2:
      phase = period / 2
      break
    case 3:
      phase = gridPeriod * 0.75
      break
  }

  const thresholdEnum = value & 0b1111
  let threshold = 0
  switch (thresholdEnum) {
    case 0:
      threshold = period - 1
      break
    default:
      threshold = ((thresholdEnum - 4) / 8) * period
      break
  }

  return { period, phase, threshold }
}
