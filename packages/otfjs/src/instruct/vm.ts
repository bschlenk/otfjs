import { MaxpTable10 } from '../tables/maxp.js'
import { Opcode } from './opcodes.js'

export function process(inst: Uint8Array, maxp: MaxpTable10) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const store = new DataView(new ArrayBuffer(maxp.maxStorage * 4))
  const stack: number[] = []
  let pc = 0

  while (pc < inst.length) {
    const opcode = inst[pc++]
    switch (opcode) {
      case Opcode.NPUSHB: {
        const n = inst[pc++]
        for (let i = 0; i < n; ++i) {
          stack.push(inst[pc++])
        }
        break
      }

      case Opcode.NPUSHW: {
        const n = inst[pc++]
        for (let i = 0; i < n; ++i) {
          stack.push(view.getInt16(pc))
          pc += 2
        }
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
        for (let i = 0; i < n; ++i) {
          stack.push(inst[pc++])
        }
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
        for (let i = 0; i < n; ++i) {
          stack.push(view.getInt16(pc))
          pc += 2
        }
        break
      }

      case Opcode.RS: {
        const s = stack.pop()! >>> 0 // unsigned cast
        stack.push(store.getUint32(s * 4))
        break
      }

      case Opcode.WS: {
        const value = stack.pop()! >>> 0 // unsigned cast
        const s = stack.pop()! >>> 0 // unsigned cast
        store.setUint32(s * 4, value)
        break
      }
    }
  }
}
