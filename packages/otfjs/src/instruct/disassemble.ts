import { toHex } from '../utils.js'
import { Opcode } from './opcode.js'

interface Instruction {
  name: string
  args?: string[]
}

export function disassemble(inst: Uint8Array) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const insts: Instruction[] = []

  let pc = 0
  const n = inst.length

  while (pc < n) {
    const opcode: Opcode = inst[pc++]

    switch (opcode) {
      case Opcode.NPUSHB: {
        const n = inst[pc++]
        const args: string[] = []
        for (let i = 0; i < n; i++) {
          args.push(toHex(inst[pc++], 1))
        }

        insts.push({ name: `NPUSHB[${n}]`, args })

        break
      }

      case Opcode.NPUSHW: {
        const n = inst[pc++]
        const args: string[] = []
        for (let i = 0; i < n; ++i) {
          args.push(toHex(view.getInt16(pc), 2))
          pc += 2
        }

        insts.push({ name: `NPUSHW[${n}]`, args })

        break
      }

      case Opcode.PUSHB0:
      case Opcode.PUSHB1:
      case Opcode.PUSHB2:
      case Opcode.PUSHB3:
      case Opcode.PUSHB4:
      case Opcode.PUSHB5:
      case Opcode.PUSHB6:
      case Opcode.PUSHB7: {
        const n = (opcode & 0b111) + 1
        const args: string[] = []
        for (let i = 0; i < n; ++i) {
          args.push(toHex(inst[pc++], 1))
        }

        insts.push({ name: `PUSHB[${n}]`, args })

        break
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
        const args: string[] = []
        for (let i = 0; i < n; ++i) {
          args.push(toHex(view.getInt16(pc), 2))
          pc += 2
        }

        insts.push({ name: `PUSHW[${n}]`, args })

        break
      }

      case Opcode.SVTCA0:
      case Opcode.SVTCA1: {
        const n = opcode & 0b1
        insts.push({ name: `SVTCA[${n}]` })
        break
      }

      case Opcode.SPVTCA0:
      case Opcode.SPVTCA1: {
        const n = opcode & 0b1
        insts.push({ name: `SPVTCA[${n}]` })
        break
      }

      case Opcode.SFVTCA0:
      case Opcode.SFVTCA1: {
        const n = opcode & 0b1
        insts.push({ name: `SFVTCA[${n}]` })
        break
      }

      case Opcode.SPVTL0:
      case Opcode.SPVTL1: {
        const n = opcode & 0b1
        insts.push({ name: `SPVTL[${n}]` })
        break
      }

      case Opcode.SFVTL0:
      case Opcode.SFVTL1: {
        const n = opcode & 0b1
        insts.push({ name: `SFVTL[${n}]` })
        break
      }

      case Opcode.SDPVTL0:
      case Opcode.SDPVTL1: {
        const n = opcode & 0b1
        insts.push({ name: `SDPVTL[${n}]` })
        break
      }

      case Opcode.GC0:
      case Opcode.GC1: {
        const n = opcode & 0b1
        insts.push({ name: `GC[${n}]` })
        break
      }

      case Opcode.MD0:
      case Opcode.MD1: {
        const n = opcode & 0b1
        insts.push({ name: `MD[${n}]` })
        break
      }

      default: {
        insts.push({ name: Opcode[opcode] ?? `🚧 ${toHex(opcode, 1)}` })
        break
      }
    }
  }

  return insts
}
