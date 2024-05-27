import { toHex } from '../utils.js'
import { Opcode } from './opcode.js'

interface Instruction {
  pc: number
  name: string
  args?: string[]
}

export function disassemble(inst: Uint8Array) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const insts: Instruction[] = []

  let ipc = 0
  const n = inst.length

  while (ipc < n) {
    const pc = ipc
    const opcode: Opcode = inst[ipc++]

    switch (opcode) {
      case Opcode.NPUSHB: {
        const n = inst[ipc++]
        const args: string[] = []
        for (let i = 0; i < n; i++) {
          args.push(toHex(inst[ipc++], 1))
        }

        insts.push({ pc, name: `NPUSHB[${n}]`, args })

        break
      }

      case Opcode.NPUSHW: {
        const n = inst[ipc++]
        const args: string[] = []
        for (let i = 0; i < n; ++i) {
          args.push(toHex(view.getInt16(ipc), 2))
          ipc += 2
        }

        insts.push({ pc, name: `NPUSHW[${n}]`, args })

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
          args.push(toHex(inst[ipc++], 1))
        }

        insts.push({ pc, name: `PUSHB[${n}]`, args })

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
          args.push(toHex(view.getInt16(ipc), 2))
          ipc += 2
        }

        insts.push({ pc, name: `PUSHW[${n}]`, args })

        break
      }

      case Opcode.SVTCA0:
      case Opcode.SVTCA1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SVTCA[${n}]` })
        break
      }

      case Opcode.SPVTCA0:
      case Opcode.SPVTCA1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SPVTCA[${n}]` })
        break
      }

      case Opcode.SFVTCA0:
      case Opcode.SFVTCA1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SFVTCA[${n}]` })
        break
      }

      case Opcode.SPVTL0:
      case Opcode.SPVTL1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SPVTL[${n}]` })
        break
      }

      case Opcode.SFVTL0:
      case Opcode.SFVTL1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SFVTL[${n}]` })
        break
      }

      case Opcode.SDPVTL0:
      case Opcode.SDPVTL1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SDPVTL[${n}]` })
        break
      }

      case Opcode.GC0:
      case Opcode.GC1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `GC[${n}]` })
        break
      }

      case Opcode.MD0:
      case Opcode.MD1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `MD[${n}]` })
        break
      }

      case Opcode.SHP0:
      case Opcode.SHP1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SHP[${n}]` })
        break
      }

      case Opcode.SHC0:
      case Opcode.SHC1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SHC[${n}]` })
        break
      }

      case Opcode.SHZ0:
      case Opcode.SHZ1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `SHZ[${n}]` })
        break
      }

      case Opcode.MSIRP0:
      case Opcode.MSIRP1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `MSIRP[${n}]` })
        break
      }

      case Opcode.MDAP0:
      case Opcode.MDAP1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `MDAP[${n}]` })
        break
      }

      case Opcode.MIAP0:
      case Opcode.MIAP1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `MIAP[${n}]` })
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
        insts.push({ pc, name: `MDRP[${bin(n, 5)}]` })
        break
      }

      case Opcode.MIRP00:
      case Opcode.MIRP01:
      case Opcode.MIRP02:
      case Opcode.MIRP03:
      case Opcode.MIRP04:
      case Opcode.MIRP05:
      case Opcode.MIRP06:
      case Opcode.MIRP07:
      case Opcode.MIRP08:
      case Opcode.MIRP09:
      case Opcode.MIRP0A:
      case Opcode.MIRP0B:
      case Opcode.MIRP0C:
      case Opcode.MIRP0D:
      case Opcode.MIRP0E:
      case Opcode.MIRP0F:
      case Opcode.MIRP10:
      case Opcode.MIRP11:
      case Opcode.MIRP12:
      case Opcode.MIRP13:
      case Opcode.MIRP14:
      case Opcode.MIRP15:
      case Opcode.MIRP16:
      case Opcode.MIRP17:
      case Opcode.MIRP18:
      case Opcode.MIRP19:
      case Opcode.MIRP1A:
      case Opcode.MIRP1B:
      case Opcode.MIRP1C:
      case Opcode.MIRP1D:
      case Opcode.MIRP1E:
      case Opcode.MIRP1F: {
        const n = opcode & 0b11111
        insts.push({ pc, name: `MIRP[${bin(n, 5)}]` })
        break
      }

      case Opcode.IUP0:
      case Opcode.IUP1: {
        const n = opcode & 0b1
        insts.push({ pc, name: `IUP[${n}]` })
        break
      }

      case Opcode.ROUND0:
      case Opcode.ROUND1:
      case Opcode.ROUND2:
      case Opcode.ROUND3: {
        const n = opcode & 0b11
        insts.push({ pc, name: `ROUND[${bin(n, 2)}]` })
        break
      }

      case Opcode.NROUND0:
      case Opcode.NROUND1:
      case Opcode.NROUND2:
      case Opcode.NROUND3: {
        const n = opcode & 0b11
        insts.push({ pc, name: `NROUND[${bin(n, 2)}]` })
        break
      }

      default: {
        insts.push({ pc, name: Opcode[opcode] ?? `🚧 ${toHex(opcode, 1)}` })
        break
      }
    }
  }

  return insts
}

function bin(n: number, bits: number) {
  return n.toString(2).padStart(bits, '0')
}
