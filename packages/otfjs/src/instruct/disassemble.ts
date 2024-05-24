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

      case Opcode.SHP0:
      case Opcode.SHP1: {
        const n = opcode & 0b1
        insts.push({ name: `SHP[${n}]` })
        break
      }

      case Opcode.SHC0:
      case Opcode.SHC1: {
        const n = opcode & 0b1
        insts.push({ name: `SHC[${n}]` })
        break
      }

      case Opcode.SHZ0:
      case Opcode.SHZ1: {
        const n = opcode & 0b1
        insts.push({ name: `SHZ[${n}]` })
        break
      }

      case Opcode.MSIRP0:
      case Opcode.MSIRP1: {
        const n = opcode & 0b1
        insts.push({ name: `MSIRP[${n}]` })
        break
      }

      case Opcode.MDAP0:
      case Opcode.MDAP1: {
        const n = opcode & 0b1
        insts.push({ name: `MDAP[${n}]` })
        break
      }

      case Opcode.MIAP0:
      case Opcode.MIAP1: {
        const n = opcode & 0b1
        insts.push({ name: `MIAP[${n}]` })
        break
      }

      case Opcode.MDRP00:
      case Opcode.MDRP01:
      case Opcode.MDRP02:
      case Opcode.MDRP03:
      case Opcode.MDRP04:
      case Opcode.MDRP05:
      case Opcode.MDRP06:
      case Opcode.MDRP07:
      case Opcode.MDRP08:
      case Opcode.MDRP09:
      case Opcode.MDRP0A:
      case Opcode.MDRP0B:
      case Opcode.MDRP0C:
      case Opcode.MDRP0D:
      case Opcode.MDRP0E:
      case Opcode.MDRP0F:
      case Opcode.MDRP10:
      case Opcode.MDRP11:
      case Opcode.MDRP12:
      case Opcode.MDRP13:
      case Opcode.MDRP14:
      case Opcode.MDRP15:
      case Opcode.MDRP16:
      case Opcode.MDRP17:
      case Opcode.MDRP18:
      case Opcode.MDRP19:
      case Opcode.MDRP1A:
      case Opcode.MDRP1B:
      case Opcode.MDRP1C:
      case Opcode.MDRP1D:
      case Opcode.MDRP1E:
      case Opcode.MDRP1F: {
        const n = opcode & 0b11111
        insts.push({ name: `MDRP[${n.toString(2).padStart(5, '0')}]` })
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
