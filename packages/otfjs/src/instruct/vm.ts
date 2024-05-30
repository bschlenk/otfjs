// Temporary while I work on this
/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Font } from '../font.js'
import { emptyGlyph, type GlyphSimple, type Point } from '../tables/glyf.js'
import { MaxpTable10 } from '../tables/maxp.js'
import { assert, debug, range, toHex } from '../utils.js'
import * as vec from '../vector.js'
import { disassemble } from './disassemble.js'
import { type GraphicsState, makeGraphicsState } from './graphics.js'
import { Opcode } from './opcode.js'
import { Stack } from './stack.js'
import {
  deltaValue,
  getinfoFlags,
  makeStore,
  opcodeLength,
  viewFor,
} from './utils.js'

const enum Touched {
  NEITHER,
  X,
  Y,
  BOTH,
}

interface Fdef {
  inst: Uint8Array
  pc: number
}

const ENDF = Symbol('ENDF')

export class VirtualMachine {
  pc = 0
  cvt: number[]
  store: DataView
  stack: Stack
  gs: GraphicsState
  fns: Fdef[] = []
  idefs: Record<number, Fdef> = {}

  glyph!: GlyphSimple
  zones!: Point[][]
  zonesOriginal!: Point[][]
  touched!: Set<Touched>[]

  private pcStack: number[] = []
  private maxp: MaxpTable10

  constructor(private font: Font) {
    const maxp = font.getTable('maxp')

    assert(
      maxp.version === 0x00010000,
      'Only version 1.0 maxp tables are supported',
    )

    this.maxp = maxp
    this.cvt = [...(font.getTableOrNull('cvt ') ?? [])]
    this.store = makeStore(maxp.maxStorage)
    this.stack = new Stack(maxp.maxStackElements)
    this.gs = makeGraphicsState()

    this.setGlyph(null)
  }

  setGlyph(glyph: GlyphSimple | null) {
    if (!glyph) {
      this.glyph = emptyGlyph()
      this.zones = [[], []]
      this.zonesOriginal = this.zones
      this.touched = [new Set(), new Set()]
      return
    }

    this.glyph = glyph
    this.zonesOriginal = [
      range(this.maxp.maxTwilightPoints, () => ({ x: 0, y: 0, onCurve: true })),
      [
        ...glyph.points,
        // phantom points
        // glyph origin
        { x: 0, y: 0, onCurve: true },
        // advance width
        { x: 0, y: 0, onCurve: true },
        // top origin
        { x: 0, y: 0, onCurve: true },
        // advanc
        { x: 0, y: 0, onCurve: true },
      ],
    ]
    this.zones = structuredClone(this.zonesOriginal)
    this.touched = [new Set(), new Set()]
  }

  getGlyph() {
    return {
      ...this.glyph,
      points: this.zones[1].slice(0, this.glyph.points.length),
    }
  }

  runFpgm() {
    const inst = this.font.getTableOrNull('fpgm')
    if (inst) {
      this.stack.clear()
      this.run(inst)
    }
  }

  runPrep() {
    const inst = this.font.getTableOrNull('prep')
    if (inst) {
      this.stack.clear()
      this.run(inst)
    }
  }

  runGlyph() {
    const inst = this.glyph.instructions
    this.stack.clear()
    this.run(inst)
  }

  run(inst: Uint8Array, pc?: number) {
    if (pc != null) {
      this.pcStack.push(this.pc)
      this.pc = pc
    } else {
      this.pc = 0
    }

    while (this.pc < inst.length) {
      const thisPc = this.pc
      try {
        if (this.step(inst) === ENDF) break
      } catch (e) {
        this.logContext(inst, thisPc)
        throw e
      }
    }

    if (pc != null) {
      this.pc = this.pcStack.pop()!
    }
  }

  step(inst: Uint8Array) {
    const opcode = inst[this.pc++]

    switch (opcode) {
      case Opcode.NPUSHB: {
        const n = inst[this.pc++]
        for (let i = 0; i < n; ++i) {
          this.stack.push(inst[this.pc++])
        }
        break
      }

      case Opcode.NPUSHW: {
        const view = viewFor(inst)
        const n = inst[this.pc++]
        for (let i = 0; i < n; ++i) {
          this.stack.push(view.getInt16(this.pc))
          this.pc += 2
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
          this.stack.push(inst[this.pc++])
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
        const view = viewFor(inst)
        const n = (opcode & 0b111) + 1
        for (let i = 0; i < n; ++i) {
          this.stack.push(view.getInt16(this.pc))
          this.pc += 2
        }
        break
      }

      case Opcode.RS: {
        const s = this.stack.popU32()
        this.stack.push(this.store.getUint32(s * 4))
        break
      }

      case Opcode.WS: {
        const value = this.stack.popU32()
        const s = this.stack.popU32()
        this.store.setUint32(s * 4, value)
        break
      }

      case Opcode.WCVTP: {
        const value = this.stack.pop26dot6()
        const c = this.stack.popU32()
        this.cvt[c] = value
        break
      }

      case Opcode.WCVTF: {
        // TODO: something something convert to pixels?
        // The value is scaled before being written to the table
        const value = this.stack.popU32()
        const c = this.stack.popU32()
        this.cvt[c] = value
        break
      }

      case Opcode.RCVT: {
        const c = this.stack.popU32()
        const value = this.cvt[c]
        this.stack.push26dot6(value)
        break
      }

      case Opcode.SVTCA0:
      case Opcode.SVTCA1: {
        const isX = opcode === Opcode.SVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        this.gs.freedomVector = vec
        this.gs.projectionVector = vec
        break
      }

      case Opcode.SPVTCA0:
      case Opcode.SPVTCA1: {
        const isX = opcode === Opcode.SPVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        this.gs.projectionVector = vec
        break
      }

      case Opcode.SFVTCA0:
      case Opcode.SFVTCA1: {
        const isX = opcode === Opcode.SFVTCA1
        const vec = isX ? { x: 1, y: 0 } : { x: 0, y: 1 }
        this.gs.freedomVector = vec
        break
      }

      case Opcode.SPVTL0:
      case Opcode.SPVTL1: {
        const rotate = opcode === Opcode.SPVTL1
        const p1 = this.zones[this.gs.zp2][this.stack.popU32()]
        const p2 = this.zones[this.gs.zp1][this.stack.popU32()]

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

        this.gs.projectionVector = { x, y }
        break
      }

      case Opcode.SFVTL0:
      case Opcode.SFVTL1: {
        const rotate = opcode === Opcode.SFVTL1
        const p1 = this.zones[this.gs.zp2][this.stack.popU32()]
        const p2 = this.zones[this.gs.zp1][this.stack.popU32()]

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

        this.gs.freedomVector = { x, y }
        break
      }

      case Opcode.SFVTPV: {
        this.gs.freedomVector = this.gs.projectionVector
        break
      }

      case Opcode.SDPVTL0:
      case Opcode.SDPVTL1: {
        const rotate = opcode === Opcode.SDPVTL1
        const p1 = this.zones[this.gs.zp2][this.stack.popU32()]
        const p2 = this.zones[this.gs.zp1][this.stack.popU32()]

        let v = vec.normalize(vec.subtract(p2, p1))

        if (rotate) {
          v = vec.rotate90(v)
        }

        // TODO: need to keep track of zones before anything has changed, and set both here
        // sounds like the dual one gets set and then is used in place of the projection vector
        // until the next instruction that sets the projection vector

        this.gs.dualProjectionVectors = v
        this.gs.projectionVector = v
        break
      }

      case Opcode.SPVFS: {
        const y = this.stack.pop2dot14()
        const x = this.stack.pop2dot14()
        this.gs.projectionVector = { x, y }
        break
      }

      case Opcode.SFVFS: {
        const y = this.stack.pop2dot14()
        const x = this.stack.pop2dot14()
        this.gs.freedomVector = { x, y }
        break
      }

      case Opcode.GPV: {
        const { x, y } = this.gs.projectionVector
        this.stack.push2dot14(x)
        this.stack.push2dot14(y)
        break
      }

      case Opcode.GFV: {
        const { x, y } = this.gs.freedomVector
        this.stack.push2dot14(x)
        this.stack.push2dot14(y)
        break
      }

      case Opcode.SRP0: {
        const value = this.stack.popU32()
        this.gs.rp0 = value
        break
      }

      case Opcode.SRP1: {
        const value = this.stack.popU32()
        this.gs.rp1 = value
        break
      }

      case Opcode.SRP2: {
        const value = this.stack.popU32()
        this.gs.rp2 = value
        break
      }

      case Opcode.SZP0: {
        const value = this.stack.popU32()
        this.gs.zp0 = value
        break
      }

      case Opcode.SZP1: {
        const value = this.stack.popU32()
        this.gs.zp1 = value
        break
      }

      case Opcode.SZP2: {
        const value = this.stack.popU32()
        this.gs.zp2 = value
        break
      }

      case Opcode.SZPS: {
        const value = this.stack.popU32()
        this.gs.zp0 = this.gs.zp1 = this.gs.zp2 = value
        break
      }

      case Opcode.RTHG: {
        this.gs.roundState = 0
        break
      }

      case Opcode.RTG: {
        this.gs.roundState = 1
        break
      }

      case Opcode.RTDG: {
        this.gs.roundState = 2
        break
      }

      case Opcode.RDTG: {
        this.gs.roundState = 3
        break
      }

      case Opcode.RUTG: {
        this.gs.roundState = 4
        break
      }

      case Opcode.ROFF: {
        this.gs.roundState = 5
        break
      }

      case Opcode.SROUND: {
        // TODO: decompose this later??
        // I think I'll need to mark that this isn't one of the above roundState enums, since they overlap
        const value = this.stack.popU32()
        this.gs.roundState = value
        break
      }

      case Opcode.S45ROUND: {
        const value = this.stack.popU32()
        this.gs.roundState = value
        break
      }

      case Opcode.SLOOP: {
        const value = this.stack.popU32()
        assert(value > 0, 'SLOOP must be greater than 0')
        this.gs.loop = value
        break
      }

      case Opcode.SMD: {
        const value = this.stack.pop26dot6()
        this.gs.minimumDistance = value
        break
      }

      case Opcode.INSTCTRL: {
        const s = this.stack.pop()
        const value = this.stack.popU32()
        // TODO: error if this is used anywhere but the cvt program
        switch (s) {
          case 1:
            if (value === 0) {
              this.gs.instructControl.disableGridFitting = false
            } else if (value === 1) {
              this.gs.instructControl.disableGridFitting = true
            }
            break
          case 2:
            if (value === 0) {
              this.gs.instructControl.ignoreCvtParams = false
            } else if (value === 2) {
              this.gs.instructControl.ignoreCvtParams = true
            }
            break
          case 3:
            if (value === 0) {
              this.gs.instructControl.nativeClearTypeMode = false
            } else if (value === 4) {
              this.gs.instructControl.nativeClearTypeMode = true
            }
            break
        }

        break
      }

      case Opcode.SCANCTRL: {
        const value = this.stack.popU32()
        this.gs.scanControl.enabled = value
        break
      }

      case Opcode.SCANTYPE: {
        const value = this.stack.popU32()
        this.gs.scanControl.rules = value
        break
      }

      case Opcode.SCVTCI: {
        const value = this.stack.pop26dot6()
        this.gs.controlValueCutIn = value
        break
      }

      case Opcode.SSWCI: {
        const value = this.stack.pop26dot6()
        this.gs.singeWidthCutIn = value
        break
      }

      case Opcode.SSW: {
        const value = this.stack.popU32()
        // TODO: convert to pixels??
        this.gs.singleWidthValue = value
        break
      }

      case Opcode.FLIPON: {
        this.gs.autoFlip = true
        break
      }

      case Opcode.FLIPOFF: {
        this.gs.autoFlip = false
        break
      }

      case Opcode.SANGW: {
        // Opcode is no longer used, but let's pop from the stack anyway for correctness
        this.stack.pop()
        break
      }

      case Opcode.SDB: {
        const value = this.stack.popU32()
        this.gs.deltaBase = value
        break
      }

      case Opcode.SDS: {
        const value = this.stack.popU32()
        this.gs.deltaShift = value
        break
      }

      case Opcode.GC0:
      case Opcode.GC1: {
        const useOriginal = opcode === Opcode.GC1
        const p = this.stack.popU32()
        // TODO: zp2 determins which zone to look at
        const pt = useOriginal ? this.zonesOriginal[1][p] : this.zones[1][p]
        // TODO: how to project a point? is that cross product?

        // TODO: verify y x is the correct order
        this.stack.push(pt.y)
        this.stack.push(pt.x)
        break
      }

      case Opcode.SCFS: {
        const value = this.stack.pop26dot6()
        const p = this.stack.popU32()
        // TODO: not sure about the math here at all
        // https://developer.apple.com/fonts/TrueType-Reference-Manual/RM05/Chap5.html#SCFS
        break
      }

      case Opcode.MD0:
      case Opcode.MD1: {
        const useOriginal = opcode === Opcode.MD1
        const p1 = this.stack.popU32()
        const p2 = this.stack.popU32()

        // TODO: the use original ones need to use zp1 and zp0 as well
        // TODO: apple's docs say zp0 and zp1, double check this?
        const pt1 =
          useOriginal ?
            this.zonesOriginal[this.gs.zp1][p1]
          : this.zones[this.gs.zp1][p1]
        const pt2 =
          useOriginal ?
            this.zonesOriginal[this.gs.zp0][p2]
          : this.zones[this.gs.zp0][p2]

        // TODO: verify I should use dual projection vector if that is set over projection vector
        // get disantce between points, projected onto projection vector
        // pushes distance in pixels as 26.6
        this.stack.push26dot6(1)

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
        this.stack.push(16)
        break
      }

      case Opcode.MPS: {
        // TODO: this needs to be passed in to the process function
        // TODO: microsoft and apple docs disagree on what the pushed type looks
        // like, microsoft says 26.6, apple says u16
        this.stack.push26dot6(12)
        break
      }

      case Opcode.FLIPPT: {
        const points = this.loop()

        for (const p of points) {
          const point = this.zones[this.gs.zp0][p]
          point.onCurve = !point.onCurve
        }

        break
      }

      case Opcode.FLIPRGON:
      case Opcode.FLIPRGOFF: {
        const on = opcode === Opcode.FLIPRGON
        const hp = this.stack.popU32()
        const lp = this.stack.popU32()
        for (let i = lp; i <= hp; ++i) {
          const point = this.zones[this.gs.zp0][i]
          point.onCurve = on
        }

        break
      }

      case Opcode.SHP0:
      case Opcode.SHP1: {
        const a = opcode & 0b1
        const rp = a === 0 ? this.gs.rp2 : this.gs.rp1
        const z = a === 0 ? this.gs.zp1 : this.gs.zp0

        const refo = this.zonesOriginal[z][rp]
        const refm = this.zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          this.gs.projectionVector,
        )
        const dv = vec.scale(this.gs.freedomVector, dist)

        const points = this.loop()
        for (const p of points) {
          const point = this.zones[this.gs.zp2][p]
          this.touched[this.gs.zp2].add(p)

          // TODO: I don't think this is correct
          // move the point p by that distance, along the freedom vector
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
        }

        break
      }

      case Opcode.SHC0:
      case Opcode.SHC1: {
        const a = opcode & 0b1
        const rp = a === 0 ? this.gs.rp2 : this.gs.rp1
        const z = a === 0 ? this.gs.zp1 : this.gs.zp0

        const refo = this.zonesOriginal[z][rp]
        const refm = this.zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          this.gs.projectionVector,
        )
        const dv = vec.scale(this.gs.freedomVector, dist)

        const c = this.stack.popU32()

        const start = c === 0 ? 0 : this.glyph.endPtsOfContours[c - 1] + 1
        const end = this.glyph.endPtsOfContours[c]

        const skip = z === this.gs.zp2 ? { ...refm } : null
        const skipTouch = skip ? this.touched[this.gs.zp2].has(rp) : false

        for (let i = start; i <= end; ++i) {
          const point = this.zones[this.gs.zp2][i]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          this.touched[this.gs.zp2].add(i)
        }

        if (skip) {
          // if the reference point is on the contour, it should not be updated
          this.zones[this.gs.zp2][rp] = skip
          if (!skipTouch) {
            this.touched[this.gs.zp2].delete(rp)
          }
        }

        break
      }

      case Opcode.SHZ0:
      case Opcode.SHZ1: {
        const a = opcode & 0b1
        const rp = a === 0 ? this.gs.rp2 : this.gs.rp1
        const z = a === 0 ? this.gs.zp1 : this.gs.zp0

        const refo = this.zonesOriginal[z][rp]
        const refm = this.zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          this.gs.projectionVector,
        )
        const dv = vec.scale(this.gs.freedomVector, dist)

        const e = this.stack.popU32()

        const skip = z === e ? { ...refm } : null
        const skipTouch = skip ? this.touched[e].has(rp) : false

        for (let i = 0; i < this.zones[e].length; ++i) {
          const point = this.zones[e][i]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          this.touched[e].add(i)
        }

        if (skip) {
          // if the reference point is on the zone, it should not be updated
          this.zones[e][rp] = skip
          if (!skipTouch) {
            this.touched[e].delete(rp)
          }
        }

        break
      }

      case Opcode.SHPIX: {
        const magnitude = this.stack.pop26dot6()
        const points = this.loop()
        const dv = vec.scale(this.gs.freedomVector, magnitude)

        for (const p of points) {
          const point = this.zones[this.gs.zp2][p]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          this.touched[this.gs.zp2].add(p)
        }

        break
      }

      case Opcode.MSIRP0:
      case Opcode.MSIRP1: {
        const a = opcode & 0b1
        const d = this.stack.pop26dot6()
        const p = this.stack.popU32()

        const point = this.zones[this.gs.zp1][p]
        const ref = this.zones[this.gs.zp0][this.gs.rp0]

        // find the distance by projecting freedom vector onto projection vector
        // TODO: I don't think this logic is correct
        const proj = vec.projectOnto(point, this.gs.projectionVector)
        const currentDistance = vec.magnitude(proj)
        const scale = d / currentDistance
        const newPoint = vec.scale(point, scale)

        point.x = newPoint.x
        point.y = newPoint.y
        this.touched[this.gs.zp1].add(p)

        this.gs.rp1 = this.gs.rp0
        this.gs.rp2 = p

        if (a === 1) {
          this.gs.rp0 = p
        }

        break
      }

      case Opcode.MDAP0:
      case Opcode.MDAP1: {
        const round = (opcode & 0b1) === 1
        const p = this.stack.popU32()

        if (round) {
          // TODO: need to figure out rounding rules
        }

        // TODO: touch needs to be direction aware (i.e. if the freedom vector
        // is orthogonal, only the pointed direction is marked touched)
        this.touched[this.gs.zp0].add(p)

        this.gs.rp0 = this.gs.rp1 = p

        break
      }

      case Opcode.MIAP0:
      case Opcode.MIAP1: {
        const round = (opcode & 0b1) === 1
        const n = this.stack.popU32()
        const p = this.stack.popU32()

        // TOOD: this instruction

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
        const a = Boolean(opcode & (0b1 << 4))
        const b = Boolean(opcode & (0b1 << 3))
        const c = Boolean(opcode & (0b1 << 2))
        const de = opcode & 0b11
        const p = this.stack.popU32()

        // TODO: this instruction

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
        const a = Boolean(opcode & (0b1 << 4))
        const b = Boolean(opcode & (0b1 << 3))
        const c = Boolean(opcode & (0b1 << 2))
        const de = opcode & 0b11
        const n = this.stack.popU32()
        const p = this.stack.popU32()

        // TODO: this instruction

        break
      }

      case Opcode.ALIGNRP: {
        const points = this.loop()
        const rp = this.zones[this.gs.zp0][this.gs.rp0]

        for (const p of points) {
          const point = this.zones[this.gs.zp1][p]
          // TODO: reduce measured distance to 0 along projection vector
        }

        break
      }

      case Opcode.AA: {
        // deprecated opcode, just pop from the stack
        this.stack.pop()
        break
      }

      case Opcode.ISECT: {
        const b1 = this.stack.popU32()
        const b0 = this.stack.popU32()
        const a1 = this.stack.popU32()
        const a0 = this.stack.popU32()
        const p = this.stack.popU32()

        // If lines A and B are parallel, point p is moved to a position in the middle of the lines. That is:
        // px = (a0x + a1x)/4 + (b0x + b1x)/4
        // py = (a0y + a1y)/4 + (b0y + b1y)/4

        // TODO: this instruction

        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/tt_instructions#align-points
      case Opcode.ALIGNPTS: {
        const p1 = this.stack.popU32()
        const p2 = this.stack.popU32()

        // TODO: this instruction
        break
      }

      case Opcode.IP: {
        const points = this.loop()
        for (const p of points) {
          // TODO: this instruction
        }

        break
      }

      case Opcode.UTP: {
        const p = this.stack.popU32()
        // TODO: need to do this along the freedom vector
        this.touched[this.gs.zp0].delete(p)
        break
      }

      case Opcode.IUP0:
      case Opcode.IUP1: {
        const a = opcode & 0b1
        // TODO: this instruction
        break
      }

      case Opcode.DELTAP1: {
        this.delta(0, (p, magnitude) => {
          const point = this.zones[this.gs.zp0][p]
          vec.addTo(point, vec.scale(this.gs.freedomVector, magnitude))
        })

        break
      }

      case Opcode.DELTAP2: {
        this.delta(16, (p, magnitude) => {
          const point = this.zones[this.gs.zp0][p]
          vec.addTo(point, vec.scale(this.gs.freedomVector, magnitude))
        })

        break
      }

      case Opcode.DELTAP3: {
        this.delta(32, (p, magnitude) => {
          const point = this.zones[this.gs.zp0][p]
          vec.addTo(point, vec.scale(this.gs.freedomVector, magnitude))
        })

        break
      }

      case Opcode.DELTAC1: {
        this.delta(0, (c, magnitude) => {
          this.cvt[c] += magnitude
        })

        break
      }
      case Opcode.DELTAC2: {
        this.delta(16, (c, magnitude) => {
          this.cvt[c] += magnitude
        })

        break
      }

      case Opcode.DELTAC3: {
        this.delta(32, (c, magnitude) => {
          this.cvt[c] += magnitude
        })

        break
      }

      case Opcode.DUP: {
        const e = this.stack.pop()
        this.stack.push(e)
        this.stack.push(e)
        break
      }

      case Opcode.POP: {
        this.stack.pop()
        break
      }

      case Opcode.CLEAR: {
        this.stack.clear()
        break
      }

      case Opcode.SWAP: {
        const e2 = this.stack.pop()
        const e1 = this.stack.pop()
        this.stack.push(e2)
        this.stack.push(e1)
        break
      }

      case Opcode.DEPTH: {
        this.stack.push(this.stack.depth())
        break
      }

      case Opcode.CINDEX: {
        const k = this.stack.pop()
        this.stack.push(this.stack.at(k))
        break
      }

      case Opcode.MINDEX: {
        const k = this.stack.pop()
        const value = this.stack.delete(k)
        this.stack.push(value)
        break
      }

      case Opcode.ROLL: {
        const a = this.stack.pop()
        const b = this.stack.pop()
        const c = this.stack.pop()
        this.stack.push(b)
        this.stack.push(a)
        this.stack.push(c)
        break
      }

      case Opcode.IF: {
        const e = this.stack.popU32()

        // continue into the block
        if (e !== 0) break

        // else skip ahead to either the next ELSE or EIF
        // but considering nested IFs

        let depth = 0
        let done = false

        while (this.pc < inst.length) {
          const next = this.seekOne(inst)

          if (next === Opcode.IF) {
            ++depth
            continue
          } else if (next === Opcode.ELSE) {
            if (depth === 0) {
              done = true
              break
            }
          } else if (next === Opcode.EIF) {
            if (depth === 0) {
              done = true
              break
            } else {
              --depth
            }
          }
        }

        if (!done) {
          throw new Error('unterminated IF block')
        }

        break
      }

      case Opcode.ELSE: {
        this.seek(inst, Opcode.EIF)
        break
      }

      case Opcode.EIF: {
        break
      }

      case Opcode.JROT: {
        const e = this.stack.popU32()
        const offset = this.stack.pop()

        if (e !== 0) {
          this.pc += offset - 1
        }

        break
      }

      case Opcode.JMPR: {
        this.pc += this.stack.pop() - 1
        break
      }

      case Opcode.JROF: {
        const e = this.stack.popU32()
        const offset = this.stack.pop()

        if (e === 0) {
          this.pc += offset - 1
        }

        break
      }

      case Opcode.LT: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(e1 < e2 ? 1 : 0)
        break
      }

      case Opcode.LTEQ: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(e1 <= e2))
        break
      }

      case Opcode.GT: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(e1 > e2))
        break
      }

      case Opcode.GTEQ: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(e1 >= e2))
        break
      }

      case Opcode.EQ: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(e1 === e2))
        break
      }

      case Opcode.NEQ: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(e1 !== e2))
        break
      }

      case Opcode.ODD:
      case Opcode.EVEN: {
        const even = opcode === Opcode.EVEN
        const e1 = this.stack.pop26dot6()
        // TODO: need to round first
        const isEven = e1 % 2 === 0
        this.stack.push(Number(even === isEven))
        break
      }

      case Opcode.AND: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(Boolean(e1 && e2)))
        break
      }

      case Opcode.OR: {
        const e2 = this.stack.popU32()
        const e1 = this.stack.popU32()
        this.stack.push(Number(Boolean(e1 || e2)))
        break
      }

      case Opcode.NOT: {
        const e = this.stack.popU32()
        this.stack.push(Number(!e))
        break
      }

      case Opcode.ADD: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        this.stack.push26dot6(n1 + n2)
        break
      }

      case Opcode.SUB: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        this.stack.push26dot6(n1 - n2)
        break
      }

      case Opcode.DIV: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        // TODO: handle divide by 0
        this.stack.push26dot6(n1 / n2)
        break
      }

      case Opcode.MUL: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        this.stack.push26dot6(n1 * n2)
        break
      }

      case Opcode.ABS: {
        const n = this.stack.pop26dot6()
        this.stack.push26dot6(Math.abs(n))
        break
      }

      case Opcode.NEG: {
        const n = this.stack.pop26dot6()
        this.stack.push26dot6(-n)
        break
      }

      case Opcode.FLOOR: {
        const n = this.stack.pop26dot6()
        this.stack.push26dot6(Math.floor(n))
        break
      }

      case Opcode.CEILING: {
        const n = this.stack.pop26dot6()
        this.stack.push26dot6(Math.ceil(n))
        break
      }

      case Opcode.MAX: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        this.stack.push26dot6(Math.max(n1, n2))
        break
      }

      case Opcode.MIN: {
        const n2 = this.stack.pop26dot6()
        const n1 = this.stack.pop26dot6()
        this.stack.push26dot6(Math.min(n1, n2))
        break
      }

      case Opcode.ROUND0:
      case Opcode.ROUND1:
      case Opcode.ROUND2:
      case Opcode.ROUND3: {
        const ab = opcode & 0b11
        const n1 = this.stack.pop()

        // TODO: do I need to do anything here? might be cool to be able to
        // define an "engine characteristic" here for experimentation

        // TODO: round n2 based on round_state
        const n2 = n1
        this.stack.push(n2)

        break
      }

      case Opcode.NROUND0:
      case Opcode.NROUND1:
      case Opcode.NROUND2:
      case Opcode.NROUND3: {
        const ab = opcode & 0b11
        const n1 = this.stack.pop()

        // TODO: do something with engine characteristic

        const n2 = n1
        this.stack.push(n2)

        break
      }

      case Opcode.FDEF: {
        const f = this.stack.pop()
        this.fns[f] = { inst, pc: this.pc }
        this.seek(inst, Opcode.ENDF)
        break
      }

      case Opcode.ENDF: {
        return ENDF
      }

      case Opcode.CALL: {
        const f = this.stack.pop()
        const fn = this.fns[f]

        assert(!!fn, `Function ${f} not defined`)

        this.run(fn.inst, fn.pc)
        break
      }

      case Opcode.LOOPCALL: {
        const f = this.stack.pop()
        const count = this.stack.pop()
        const fn = this.fns[f]
        assert(!!fn, `Function ${f} not defined`)

        for (let i = 0; i < count; ++i) {
          this.run(fn.inst, fn.pc)
        }

        break
      }

      case Opcode.IDEF: {
        const opcode = this.stack.popU32()

        assert(
          Opcode[opcode] === undefined,
          'Cannot redefine an existing opcode',
        )

        this.idefs[opcode] = { inst, pc: this.pc }
        this.seek(inst, Opcode.ENDF)
        break
      }

      case Opcode.DEBUG: {
        const n = this.stack.popU32()
        console.log(debug(n))
        break
      }

      case Opcode.GETINFO: {
        const flags = getinfoFlags(this.stack.pop())
        let result = 0

        if (flags.version) {
          // TODO: allow configuring the version?
          result |= 42
        }

        if (flags.rotation) {
          // TODO: check if glyph is rotated
        }

        if (flags.stretch) {
          // TODO: check if glyph is stretched
        }

        if (flags.variations) {
          result |= 1 << 10
        }

        if (flags.verticalPhantom) {
          // TODO: not sure what this means
        }

        if (flags.greyscale) {
          // TODO: configurable?
        }

        // Ignoring cleartype requests for now - bits will always be 0

        this.stack.push(result)

        break
      }

      case Opcode.GETVARIATION: {
        // TODO: this instruction
        this.stack.push(0)
        this.stack.push(0)
        break
      }

      default: {
        const fn = this.idefs[opcode]
        assert(!!fn, `Unknown opcode ${toHex(opcode, 1)}`)

        this.run(fn.inst, fn.pc)
      }
    }
  }

  // affects ALIGNRP, FLIPPT, IP, SHP, SHPIX
  private loop() {
    const points = range(this.gs.loop, () => this.stack.popU32())
    this.gs.loop = 1
    return points
  }

  private seek(inst: Uint8Array, ...opcodes: Opcode[]) {
    while (this.pc < inst.length) {
      const opcode = this.seekOne(inst)
      if (opcodes.includes(opcode)) return
    }

    throw new Error(
      `Expected ${opcodes.map((o) => Opcode[o]).join(' or ')} but reached the end of the program`,
    )
  }

  private seekOne(inst: Uint8Array) {
    const next = inst[this.pc]
    this.pc += opcodeLength(inst, this.pc)
    return next
  }

  private delta(offset: number, cb: (i: number, magnitude: number) => void) {
    const n = this.stack.popU32()
    const pairs = range(n, () => [this.stack.popU32(), this.stack.popU32()])

    // TODO: need to know the ppem to know when this delta applies
    // if the ppem is greater than gs.deltaBase + 16, skip
    const ppem = 16

    if (ppem < this.gs.deltaBase + offset) return
    if (ppem >= this.gs.deltaBase + 16 + offset) return

    const step = 1 / 2 ** this.gs.deltaShift

    for (const [i, arg] of pairs) {
      // TODO: check the ppem here against the current ppem
      const ppem = ((arg >>> 4) & 0b1111) + this.gs.deltaBase
      const magnitude = deltaValue(arg & 0b1111) * step

      cb(i, magnitude)
    }
  }

  logContext(inst: Uint8Array, pc: number, before = 10, after = 10) {
    const msg = []
    const d = disassemble(inst)
    const i = d.findIndex((i) => i.pc === pc)
    const ctx = d.slice(i - before, i + after)
    const maxPcLength = Math.max(...ctx.map((c) => c.pc.toString().length))
    for (let i = 0; i < ctx.length; ++i) {
      const c = ctx[i]
      const arrow = i === before ? '->' : '  '
      msg.push(`${arrow} ${('' + c.pc).padStart(maxPcLength, ' ')}: ${c.name}`)
    }

    console.log(msg.join('\n'))
  }
}
