import { GlyphSimple } from '../tables/glyf.js'
import { MaxpTable10 } from '../tables/maxp.js'
import { range } from '../utils.js'
import { makeGraphicsState } from './graphics.js'
import { Opcode } from './opcode.js'
import { Stack } from './stack.js'

export function process(
  inst: Uint8Array,
  maxp: MaxpTable10,
  cvt: number[],
  glyph: GlyphSimple,
) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const store = new DataView(new ArrayBuffer(maxp.maxStorage * 4))
  const stack = new Stack(maxp.maxStackElements)
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
        const s = stack.popU32()
        stack.push(store.getUint32(s * 4))
        break
      }

      case Opcode.WS: {
        const value = stack.popU32()
        const s = stack.popU32()
        store.setUint32(s * 4, value)
        break
      }

      case Opcode.WCVTP: {
        const value = stack.pop26dot6()
        const c = stack.popU32()
        cvt[c] = value
        break
      }

      case Opcode.WCVTF: {
        // TODO: something something convert to pixels?
        // The value is scaled before being written to the table
        const value = stack.popU32()
        const c = stack.popU32()
        cvt[c] = value
        break
      }

      case Opcode.RCVT: {
        const c = stack.popU32()
        const value = cvt[c]
        stack.push26dot6(value)
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
        const p1 = zones[gs.zp2][stack.popU32()]
        const p2 = zones[gs.zp1][stack.popU32()]

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
        const p1 = zones[gs.zp2][stack.popU32()]
        const p2 = zones[gs.zp1][stack.popU32()]

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
        const p1 = zones[gs.zp2][stack.popU32()]
        const p2 = zones[gs.zp1][stack.popU32()]

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
        const y = stack.pop2dot14()
        const x = stack.pop2dot14()
        gs.projectionVector = { x, y }
        break
      }

      case Opcode.SFVFS: {
        const y = stack.pop2dot14()
        const x = stack.pop2dot14()
        gs.freedomVector = { x, y }
        break
      }

      case Opcode.GPV: {
        const { x, y } = gs.projectionVector
        stack.push2dot14(x)
        stack.push2dot14(y)
        break
      }

      case Opcode.GFV: {
        const { x, y } = gs.freedomVector
        stack.push2dot14(x)
        stack.push2dot14(y)
        break
      }

      case Opcode.SRP0: {
        const value = stack.popU32()
        gs.rp0 = value
        break
      }

      case Opcode.SRP1: {
        const value = stack.popU32()
        gs.rp1 = value
        break
      }

      case Opcode.SRP2: {
        const value = stack.popU32()
        gs.rp2 = value
        break
      }

      case Opcode.SZP0: {
        const value = stack.popU32()
        gs.zp0 = value
        break
      }

      case Opcode.SZP1: {
        const value = stack.popU32()
        gs.zp1 = value
        break
      }

      case Opcode.SZP2: {
        const value = stack.popU32()
        gs.zp2 = value
        break
      }

      case Opcode.SZPS: {
        const value = stack.popU32()
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

      case Opcode.SROUND: {
        // TODO: decompose this later??
        // I think I'll need to mark that this isn't one of the above roundState enums, since they overlap
        const value = stack.popU32()
        gs.roundState = value
        break
      }

      case Opcode.S45ROUND: {
        const value = stack.popU32()
        gs.roundState = value
        break
      }

      case Opcode.SLOOP: {
        const value = stack.popU32()
        gs.loop = value
        break
      }

      case Opcode.SMD: {
        // TODO: 26.6
        const value = stack.popU32()
        gs.minimumDistance = value
        break
      }

      case Opcode.INSTCTRL: {
        const s = stack.pop()
        const value = stack.popU32()
        // TODO: error if this is used anywhere but the cvt program
        switch (s) {
          case 1:
            if (value === 0) {
              gs.instructControl.disableGridFitting = false
            } else if (value === 1) {
              gs.instructControl.disableGridFitting = true
            }
            break
          case 2:
            if (value === 0) {
              gs.instructControl.ignoreCvtParams = false
            } else if (value === 2) {
              gs.instructControl.ignoreCvtParams = true
            }
            break
          case 3:
            if (value === 0) {
              gs.instructControl.nativeClearTypeMode = false
            } else if (value === 4) {
              gs.instructControl.nativeClearTypeMode = true
            }
            break
        }

        break
      }

      case Opcode.SCANCTRL: {
        const value = stack.popU32()
        gs.scanControl.enabled = value
        break
      }

      case Opcode.SCANTYPE: {
        const value = stack.popU32()
        gs.scanControl.rules = value
        break
      }

      case Opcode.SCVTCI: {
        const value = stack.popU32()
        // TODO: 26.6
        gs.controlValueCutIn = value
        break
      }

      case Opcode.SSWCI: {
        const value = stack.popU32()
        // TODO: 26.6
        gs.singeWidthCutIn = value
        break
      }

      case Opcode.SSW: {
        const value = stack.popU32()
        // TODO: convert to pixels??
        gs.singleWidthValue = value
        break
      }

      case Opcode.FLIPON: {
        gs.autoFlip = true
        break
      }

      case Opcode.FLIPOFF: {
        gs.autoFlip = false
        break
      }

      case Opcode.SANGW: {
        // Opcode is no longer used, but let's pop from the stack anyway for correctness
        stack.pop()
        break
      }

      case Opcode.SDB: {
        const value = stack.popU32()
        gs.deltaBase = value
        break
      }

      case Opcode.SDS: {
        const value = stack.popU32()
        gs.deltaShift = value
        break
      }

      case Opcode.GC0:
      case Opcode.GC1: {
        const useOriginal = opcode === Opcode.GC1
        const p = stack.popU32()
        // TODO: zp2 determins which zone to look at
        const pt = useOriginal ? glyph.points[p] : zones[1][p]
        // TODO: how to project a point? is that cross product?

        // TODO: verify y x is the correct order
        stack.push(pt.y)
        stack.push(pt.x)
        break
      }

      case Opcode.SCFS: {
        const value = stack.pop26dot6()
        const p = stack.popU32()
        // TODO: not sure about the math here at all
        // https://developer.apple.com/fonts/TrueType-Reference-Manual/RM05/Chap5.html#SCFS
        break
      }

      case Opcode.MD0:
      case Opcode.MD1: {
        const useOriginal = opcode === Opcode.MD1
        const p1 = stack.popU32()
        const p2 = stack.popU32()

        // TODO: the use original ones need to use zp1 and zp0 as well
        // TODO: apple's docs say zp0 and zp1, double check this?
        const pt1 = useOriginal ? glyph.points[p1] : zones[gs.zp1][p1]
        const pt2 = useOriginal ? glyph.points[p2] : zones[gs.zp0][p2]

        // TODO: verify I should use dual projection vector if that is set over projection vector
        // get disantce between points, projected onto projection vector
        // pushes distance in pixels as 26.6

        break
      }

      case Opcode.MPPEM: {
        // Pushes the current number of pixels per em onto the stack. Pixels per
        // em is a function of the resolution of the rendering device and the
        // current point size and the current transformation matrix. This
        // instruction looks at the projection vector and returns the number of
        // pixels per em in that direction. The number is always an integer.

        // TODO: not sure what it means to measure along the projection vector,
        // or why that would always be an integer
        break
      }

      case Opcode.MPS: {
        // TODO: this needs to be passed in to the process function
        // TODO: microsoft and apple docs disagree on what the pushed type looks
        // like, microsoft says 26.6, apple says u16
        stack.push(12)
        break
      }
    }
  }
}
