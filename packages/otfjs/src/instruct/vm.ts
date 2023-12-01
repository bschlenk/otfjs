import { GlyphSimple } from '../tables/glyf.js'
import { MaxpTable10 } from '../tables/maxp.js'
import { range } from '../utils.js'
import { makeGraphicsState } from './graphics.js'
import { Opcode } from './opcodes.js'

export function process(
  inst: Uint8Array,
  maxp: MaxpTable10,
  cvt: number[],
  glyph: GlyphSimple,
) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const store = new DataView(new ArrayBuffer(maxp.maxStorage * 4))
  const stack: number[] = []
  const gs = makeGraphicsState()
  const zones = [
    range(maxp.maxTwilightPoints, () => ({ x: 0, y: 0 })),
    [...glyph.points],
  ]

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

      case Opcode.WCVTP: {
        // TODO: this is 26.6 fixed point
        const value = stack.pop()! >>> 0 // unsigned cast
        const c = stack.pop()! >>> 0 // unsigned cast
        cvt[c] = value
        break
      }

      case Opcode.WCVTF: {
        // TODO: something something convert to pixels?
        // The value is scaled before being written to the table
        const value = stack.pop()! >>> 0 // unsigned cast
        const c = stack.pop()! >>> 0 // unsigned cast
        cvt[c] = value
        break
      }

      case Opcode.RCVT: {
        const c = stack.pop()! >>> 0 // unsigned cast
        const value = cvt[c]
        // TODO: this is 26.6 fixed point
        stack.push(value)
        break
      }

      case Opcode.SVTCA0:
      case Opcode.SVTCA1: {
        const isX = opcode === Opcode.SVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        gs.freedomVector = vec
        gs.projectionVector = vec
        break
      }

      case Opcode.SPVTCA0:
      case Opcode.SPVTCA1: {
        const isX = opcode === Opcode.SPVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        gs.projectionVector = vec
        break
      }

      case Opcode.SFVTCA0:
      case Opcode.SFVTCA1: {
        const isX = opcode === Opcode.SFVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        gs.freedomVector = vec
        break
      }

      case Opcode.SPVTL0:
      case Opcode.SPVTL1: {
        const rotate = opcode === Opcode.SPVTL1
        const p1 = zones[gs.zp2][stack.pop()! >>> 0]
        const p2 = zones[gs.zp1][stack.pop()! >>> 0]

        let x = p2.x - p1.x
        let y = p2.y - p1.y
        const m = Math.sqrt(x ** 2 + y ** 2)

        x /= m
        y /= m

        if (rotate) {
          const tmp = x
          x = -y
          y = tmp
        }

        gs.projectionVector = { x, y }
        break
      }

      case Opcode.SFVTL0:
      case Opcode.SFVTL1: {
        const rotate = opcode === Opcode.SFVTL1
        const p1 = zones[gs.zp2][stack.pop()! >>> 0]
        const p2 = zones[gs.zp1][stack.pop()! >>> 0]

        let x = p2.x - p1.x
        let y = p2.y - p1.y
        const m = Math.sqrt(x ** 2 + y ** 2)

        x /= m
        y /= m

        if (rotate) {
          const tmp = x
          x = -y
          y = tmp
        }

        gs.freedomVector = { x, y }
        break
      }

      case Opcode.SFVTPV: {
        gs.freedomVector = gs.projectionVector
        break
      }

      case Opcode.SDPVTL0:
      case Opcode.SDPVTL1: {
        const rotate = opcode === Opcode.SDPVTL1
        const p1 = zones[gs.zp2][stack.pop()! >>> 0]
        const p2 = zones[gs.zp1][stack.pop()! >>> 0]

        let x = p2.x - p1.x
        let y = p2.y - p1.y
        const m = Math.sqrt(x ** 2 + y ** 2)

        x /= m
        y /= m

        if (rotate) {
          const tmp = x
          x = -y
          y = tmp
        }

        // TODO: need to keep track of zones before anything has changed, and set both here
        // sounds like the dual one gets set and then is used in place of the projection vector
        // until the next instruction that sets the projection vector

        gs.dualProjectionVectors = { x, y }
        gs.projectionVector = { x, y }
        break
      }

      case Opcode.SPVFS: {
        // TODO: these are 2.14 numbers
        const y = stack.pop()!
        const x = stack.pop()!
        gs.projectionVector = { x, y }
        break
      }

      case Opcode.SFVFS: {
        // TODO: these are 2.14 numbers
        const y = stack.pop()!
        const x = stack.pop()!
        gs.freedomVector = { x, y }
        break
      }

      case Opcode.GPV: {
        const { x, y } = gs.projectionVector
        // TODO: push these as 2.14 numbers
        stack.push(x)
        stack.push(y)
        break
      }

      case Opcode.GFV: {
        const { x, y } = gs.freedomVector
        // TODO: push these as 2.14 numbers
        stack.push(x)
        stack.push(y)
        break
      }

      case Opcode.SRP0: {
        const value = stack.pop()! >>> 0
        gs.rp0 = value
        break
      }

      case Opcode.SRP1: {
        const value = stack.pop()! >>> 0
        gs.rp1 = value
        break
      }

      case Opcode.SRP2: {
        const value = stack.pop()! >>> 0
        gs.rp2 = value
        break
      }

      case Opcode.SZP0: {
        const value = stack.pop()! >>> 0
        gs.zp0 = value
        break
      }

      case Opcode.SZP1: {
        const value = stack.pop()! >>> 0
        gs.zp1 = value
        break
      }

      case Opcode.SZP2: {
        const value = stack.pop()! >>> 0
        gs.zp2 = value
        break
      }

      case Opcode.SZPS: {
        const value = stack.pop()! >>> 0
        gs.zp0 = gs.zp1 = gs.zp2 = value
        break
      }

      case Opcode.RTHG: {
        gs.roundState = 0
        break
      }

      case Opcode.RTG: {
        gs.roundState = 1
        break
      }

      case Opcode.RTDG: {
        gs.roundState = 2
        break
      }

      case Opcode.RDTG: {
        gs.roundState = 3
        break
      }

      case Opcode.RUTG: {
        gs.roundState = 4
        break
      }

      case Opcode.ROFF: {
        gs.roundState = 5
        break
      }
    }
  }
}
