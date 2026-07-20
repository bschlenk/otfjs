import * as vec from '@bschlenk/vec'

import type { Font } from '../font.js'
import { emptyGlyph } from '../tables/glyf.js'
import { MaxpTable10 } from '../tables/maxp.js'
import type { GlyphSimple, Point } from '../types.js'
import { symmetricCeil, symmetricFloor, symmetricRound } from '../utils/math.js'
import { assert, debug, error, range, toHex } from '../utils/utils.js'
import { disassemble } from './disassemble.js'
import {
  type GraphicsState,
  makeGraphicsState,
  RoundState,
} from './graphics.js'
import { Opcode } from './opcode.js'
import { Stack } from './stack.js'
import {
  asDistanceType,
  clampToMinimumDistance,
  customRoundState,
  deltaValue,
  DistanceType,
  getinfoFlags,
  makeStore,
  opcodeLength,
  SQRT2_2,
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

  upem: number
  fontSize = 16
  compensation = { black: 0, white: 0 }

  private pcStack: number[] = []
  private maxp: MaxpTable10

  constructor(private font: Font) {
    const maxp = font.getTable('maxp')

    assert(
      maxp.version === 0x00010000,
      'Only version 1.0 maxp tables are supported',
    )

    this.maxp = maxp
    this.upem = font.unitsPerEm
    this.cvt = [...(font.getTableOrNull('cvt ') ?? [])]
    this.store = makeStore(maxp.maxStorage)
    this.stack = new Stack(maxp.maxStackElements)
    this.gs = makeGraphicsState()

    this.setGlyph(null)
  }

  setFontSize(px: number) {
    this.fontSize = px
    const scale = px / this.upem
    this.cvt = [...(this.font.getTableOrNull('cvt ') ?? [])].map(
      (v) => v * scale,
    )
  }

  setGlyph(
    glyph: GlyphSimple | null,
    advanceWidth = 0,
    lsb = 0,
    phaseX = 0,
    phaseY = 0,
  ) {
    // reset each time a new glyph is set
    // https://developer.apple.com/fonts/TrueType-Reference-Manual/RM02/Chap2.html#graphics_state
    this.gs = makeGraphicsState()

    if (!glyph) {
      this.glyph = emptyGlyph()
      this.zones = [[], []]
      this.zonesOriginal = this.zones
      this.touched = [new Set(), new Set()]
      return
    }

    this.glyph = glyph

    // 4 public phantom points + 4 private zeros (matching Apple's kPrivatePhantomCount = 8)
    const pp = (x: number, y: number) => ({ x, y, onCurve: true as const })
    const phantomPoints = [
      pp(lsb + phaseX, phaseY), // pp0: left side bearing
      pp(lsb + advanceWidth + phaseX, phaseY), // pp1: advance width endpoint
      pp(phaseX, phaseY), // pp2: top origin (vertical metrics)
      pp(phaseX, phaseY), // pp3: advance height endpoint
      pp(0, 0),
      pp(0, 0),
      pp(0, 0),
      pp(0, 0), // pp4–pp7: private zeros
    ]

    const shiftedPoints = glyph.points.map((p) => ({
      ...p,
      x: p.x + phaseX,
      y: p.y + phaseY,
    }))

    this.zonesOriginal = [
      range(this.maxp.maxTwilightPoints, () => ({ x: 0, y: 0, onCurve: true })),
      [...shiftedPoints, ...phantomPoints],
    ]
    this.zones = structuredClone(this.zonesOriginal)
    this.touched = [new Set(), new Set()]
  }

  getGlyph() {
    const points = this.zones[1].slice(0, this.glyph.points.length)
    if (!points.length) return { ...this.glyph, points }
    let xMin = Infinity,
      xMax = -Infinity,
      yMin = Infinity,
      yMax = -Infinity
    for (const p of points) {
      if (p.x < xMin) xMin = p.x
      if (p.x > xMax) xMax = p.x
      if (p.y < yMin) yMin = p.y
      if (p.y > yMax) yMax = p.y
    }
    return { ...this.glyph, xMin, xMax, yMin, yMax, points }
  }

  /**
   * Update how the instructions MDRP, MIRP, ROUND, NROUND compensate for
   * distances spanning black or white space.
   */
  setCompensation(values: { black?: number; white?: number }) {
    Object.assign(this.compensation, values)
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
    const opcode: Opcode = inst[this.pc++]

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
        const value = this.stack.popU32()
        const c = this.stack.popU32()
        const scale = this.fontSize / this.upem
        this.cvt[c] = value * scale
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
        const p2Idx = this.stack.popU32()
        const p1Idx = this.stack.popU32()
        const p2 = this.zones[this.gs.zp2][p2Idx]
        const p1 = this.zones[this.gs.zp1][p1Idx]
        this.gs.projectionVector = this.unitVectorFromPoints(p1, p2, rotate)
        break
      }

      case Opcode.SFVTL0:
      case Opcode.SFVTL1: {
        const rotate = opcode === Opcode.SFVTL1
        const p2Idx = this.stack.popU32()
        const p1Idx = this.stack.popU32()
        const p2 = this.zones[this.gs.zp2][p2Idx]
        const p1 = this.zones[this.gs.zp1][p1Idx]
        this.gs.freedomVector = this.unitVectorFromPoints(p1, p2, rotate)
        break
      }

      case Opcode.SFVTPV: {
        this.gs.freedomVector = this.gs.projectionVector
        break
      }

      case Opcode.SDPVTL0:
      case Opcode.SDPVTL1: {
        const rotate = opcode === Opcode.SDPVTL1
        const p2Idx = this.stack.popU32()
        const p1Idx = this.stack.popU32()

        // Projection vector computed from hinted (current) positions
        const p1h = this.zones[this.gs.zp1][p1Idx]
        const p2h = this.zones[this.gs.zp2][p2Idx]
        // Dual projection vector computed from scaled (original) positions
        const p1s = this.zonesOriginal[this.gs.zp1][p1Idx]
        const p2s = this.zonesOriginal[this.gs.zp2][p2Idx]

        const projVec = this.unitVectorFromPoints(p1h, p2h, rotate)
        const dualProjVec = this.unitVectorFromPoints(p1s, p2s, rotate)

        this.gs.projectionVector = projVec
        this.gs.dualProjectionVector = dualProjVec
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
        this.gs.roundState = RoundState.HALF_GRID
        break
      }

      case Opcode.RTG: {
        this.gs.roundState = RoundState.GRID
        break
      }

      case Opcode.RTDG: {
        this.gs.roundState = RoundState.DOUBLE_GRID
        break
      }

      case Opcode.RDTG: {
        this.gs.roundState = RoundState.DOWN_TO_GRID
        break
      }

      case Opcode.RUTG: {
        this.gs.roundState = RoundState.UP_TO_GRID
        break
      }

      case Opcode.ROFF: {
        this.gs.roundState = RoundState.OFF
        break
      }

      case Opcode.SROUND: {
        const value = this.stack.popU32()
        this.gs.roundState = RoundState.CUSTOM
        this.gs.roundStateCustom = customRoundState(value, 1)
        break
      }

      case Opcode.S45ROUND: {
        const value = this.stack.popU32()
        this.gs.roundState = RoundState.CUSTOM
        this.gs.roundStateCustom = customRoundState(value, SQRT2_2)
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
        this.gs.singleWidthValue = value * (this.fontSize / this.upem)
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
        const pt =
          useOriginal ?
            this.zonesOriginal[this.gs.zp2][p]
          : this.zones[this.gs.zp2][p]
        const pv = useOriginal ? this.dualProjVec() : this.gs.projectionVector
        // Project the point onto the (dual) projection vector
        this.stack.push26dot6(pv.x * pt.x + pv.y * pt.y)
        break
      }

      case Opcode.SCFS: {
        const value = this.stack.pop26dot6()
        const p = this.stack.popU32()
        const pv = this.gs.projectionVector
        const pt = this.zones[this.gs.zp2][p]
        // Current projection of the point along the projection vector
        const currentProj = pv.x * pt.x + pv.y * pt.y
        // Move it so its projection equals value
        this.movePoint(this.gs.zp2, p, value - currentProj)
        // In twilight zone, also update the original position
        if (this.gs.zp2 === 0) {
          const hinted = this.zones[0][p]
          const orig = this.zonesOriginal[0][p]
          orig.x = hinted.x
          orig.y = hinted.y
        }
        break
      }

      case Opcode.MD0:
      case Opcode.MD1: {
        const useOriginal = opcode === Opcode.MD1
        // Stack: p2 on top (zp1), p1 below (zp0)
        const p2 = this.stack.popU32()
        const p1 = this.stack.popU32()

        if (!useOriginal) {
          // MD0: hinted positions, projection vector
          const pt1 = this.zones[this.gs.zp0][p1]
          const pt2 = this.zones[this.gs.zp1][p2]
          const pv = this.gs.projectionVector
          this.stack.push26dot6(pv.x * (pt1.x - pt2.x) + pv.y * (pt1.y - pt2.y))
        } else {
          // MD1: original (unscaled) positions, dual projection vector
          const pt1 = this.zonesOriginal[this.gs.zp0][p1]
          const pt2 = this.zonesOriginal[this.gs.zp1][p2]
          const dv = this.dualProjVec()
          this.stack.push26dot6(dv.x * (pt1.x - pt2.x) + dv.y * (pt1.y - pt2.y))
        }

        break
      }

      case Opcode.MPPEM: {
        // Pixels per em — for axis-aligned projection vectors, equals fontSize.
        this.stack.push(Math.round(this.fontSize))
        break
      }

      case Opcode.MPS: {
        // Point size — treat as equal to pixel size for screen rendering.
        this.stack.push(Math.round(this.fontSize))
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
        // a=0: use rp2 in zp1; a=1: use rp1 in zp0
        const a = opcode & 0b1
        const rp = a === 0 ? this.gs.rp2 : this.gs.rp1
        const z = a === 0 ? this.gs.zp1 : this.gs.zp0

        const refo = this.zonesOriginal[z][rp]
        const refm = this.zones[z][rp]

        // How much the reference point moved along the projection vector
        const pv = this.gs.projectionVector
        const dist = pv.x * (refm.x - refo.x) + pv.y * (refm.y - refo.y)

        const points = this.loop()
        for (const p of points) {
          this.movePoint(this.gs.zp2, p, dist)
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

        const pv = this.gs.projectionVector
        const dist = pv.x * (refm.x - refo.x) + pv.y * (refm.y - refo.y)

        const c = this.stack.popU32()

        const start = c === 0 ? 0 : this.glyph.endPtsOfContours[c - 1] + 1
        const end = this.glyph.endPtsOfContours[c]

        const skipPos = z === this.gs.zp2 ? { x: refm.x, y: refm.y } : null
        const skipTouched = skipPos ? this.touched[this.gs.zp2].has(rp) : false

        for (let i = start; i <= end; ++i) {
          if (i === rp && z === this.gs.zp2) continue
          this.movePoint(this.gs.zp2, i, dist)
        }

        if (skipPos) {
          const pt = this.zones[this.gs.zp2][rp]
          pt.x = skipPos.x
          pt.y = skipPos.y
          if (!skipTouched) {
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

        const pv = this.gs.projectionVector
        const dist = pv.x * (refm.x - refo.x) + pv.y * (refm.y - refo.y)

        const e = this.stack.popU32()

        const skipPos = z === e ? { x: refm.x, y: refm.y } : null
        const skipTouched = skipPos ? this.touched[e].has(rp) : false

        for (let i = 0; i < this.zones[e].length; ++i) {
          if (i === rp && z === e) continue
          this.movePoint(e, i, dist)
        }

        if (skipPos) {
          const pt = this.zones[e][rp]
          pt.x = skipPos.x
          pt.y = skipPos.y
          if (!skipTouched) {
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
        const setRp0 = Boolean(opcode & 0b1)
        const distanceValue = this.stack.pop26dot6()
        const pointToModify = this.stack.popU32()
        const rp0 = this.gs.rp0

        const refHinted = this.zones[this.gs.zp0][rp0]

        // In twilight zone, pre-position the point along projection vector
        if (this.gs.zp1 === 0) {
          const pv = this.gs.projectionVector
          const refOrig = this.zonesOriginal[this.gs.zp0][rp0]
          const orig = this.zonesOriginal[0][pointToModify]
          orig.x = refOrig.x + distanceValue * pv.x
          orig.y = refOrig.y + distanceValue * pv.y
          const hinted = this.zones[0][pointToModify]
          hinted.x = refHinted.x + distanceValue * pv.x
          hinted.y = refHinted.y + distanceValue * pv.y
        }

        const pt = this.zones[this.gs.zp1][pointToModify]
        const pv = this.gs.projectionVector
        // Current projected distance from ref to point
        const currentDist =
          pv.x * (pt.x - refHinted.x) + pv.y * (pt.y - refHinted.y)
        const msirpDelta = distanceValue - currentDist
        this.movePoint(this.gs.zp1, pointToModify, msirpDelta)

        this.gs.rp1 = rp0
        this.gs.rp2 = pointToModify
        if (setRp0) {
          this.gs.rp0 = pointToModify
        }

        break
      }

      case Opcode.MDAP0:
      case Opcode.MDAP1: {
        const round = (opcode & 0b1) === 1
        const p = this.stack.popU32()

        const pv = this.gs.projectionVector
        const pt = this.zones[this.gs.zp0][p]
        const currentProj = pv.x * pt.x + pv.y * pt.y

        let delta = 0
        if (round) {
          const rounded = this.round(currentProj)
          delta = rounded - currentProj
        }

        this.movePoint(this.gs.zp0, p, delta)
        this.gs.rp0 = this.gs.rp1 = p

        break
      }

      case Opcode.MIAP0:
      case Opcode.MIAP1: {
        const round = (opcode & 0b1) === 1
        const n = this.stack.popU32()
        const p = this.stack.popU32()

        const cvtValue = this.cvt[n] ?? 0
        const pv = this.gs.projectionVector

        let currentProj: number
        if (this.gs.zp0 === 0) {
          // Twilight zone: pre-position the point along the projection vector
          const pt = this.zones[0][p]
          pt.x = cvtValue * pv.x
          pt.y = cvtValue * pv.y
          const orig = this.zonesOriginal[0][p]
          orig.x = pt.x
          orig.y = pt.y
          currentProj = cvtValue
        } else {
          const pt = this.zones[this.gs.zp0][p]
          currentProj = pv.x * pt.x + pv.y * pt.y
        }

        this.gs.rp0 = p
        this.gs.rp1 = p

        let newProj = cvtValue
        if (round) {
          newProj = this.roundAndCutIn(cvtValue, currentProj)
        }

        this.movePoint(this.gs.zp0, p, newProj - currentProj)
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
        // Flags: a=set rp0, b=use minimum distance, c=round, de=distance type
        const setRp0 = Boolean(opcode & (0b1 << 4))
        const useMinDist = Boolean(opcode & (0b1 << 3))
        const doRound = Boolean(opcode & (0b1 << 2))
        const distType = asDistanceType(opcode & 0b11)

        const pt1Index = this.stack.popU32()
        const pt0Index = this.gs.rp0

        // Measure original distance between rp0 and point (along dual projection vector)
        const dv = this.dualProjVec()
        const pt0Orig = this.zonesOriginal[this.gs.zp0][pt0Index]
        const pt1Orig = this.zonesOriginal[this.gs.zp1][pt1Index]
        let distanceToMove =
          dv.x * (pt1Orig.x - pt0Orig.x) + dv.y * (pt1Orig.y - pt0Orig.y)

        distanceToMove = this.applySingleWidthCutIn(distanceToMove)
        const wasNegative = distanceToMove < 0

        if (doRound) {
          distanceToMove = this.round(this.compensate(distanceToMove, distType))
        }

        if (useMinDist) {
          distanceToMove = clampToMinimumDistance(
            this.gs.minimumDistance,
            distanceToMove,
            wasNegative,
          )
        }

        // Compute how far the point currently is from rp0 along projection vector
        const pv = this.gs.projectionVector
        const pt0Hinted = this.zones[this.gs.zp0][pt0Index]
        const pt1Hinted = this.zones[this.gs.zp1][pt1Index]
        const currentDist =
          pv.x * (pt1Hinted.x - pt0Hinted.x) +
          pv.y * (pt1Hinted.y - pt0Hinted.y)

        const mdrpDelta = distanceToMove - currentDist
        this.movePoint(this.gs.zp1, pt1Index, mdrpDelta)

        this.gs.rp1 = pt0Index
        this.gs.rp2 = pt1Index
        if (setRp0) this.gs.rp0 = pt1Index

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
        // Flags: a=set rp0, b=use min distance, c=round+cutIn, de=distance type
        const setRp0 = Boolean(opcode & (0b1 << 4))
        const useMinDist = Boolean(opcode & (0b1 << 3))
        const roundAndCutInFlag = Boolean(opcode & (0b1 << 2))
        const distType = asDistanceType(opcode & 0b11)

        const cvtIndex = this.stack.popU32()
        const pointIndex = this.stack.popU32()
        const rp0 = this.gs.rp0

        let distanceToMove = this.cvt[cvtIndex] ?? 0
        distanceToMove = this.applySingleWidthCutIn(distanceToMove)

        const pv = this.gs.projectionVector
        const rpHinted = this.zones[this.gs.zp0][rp0]
        const pt = this.zones[this.gs.zp1][pointIndex]

        let distanceBetweenPoints: number
        if (this.gs.zp1 === 0) {
          // Twilight zone: pre-position the point
          const rpOrig = this.zonesOriginal[this.gs.zp0][rp0]
          const orig = this.zonesOriginal[0][pointIndex]
          orig.x = rpOrig.x + distanceToMove * pv.x
          orig.y = rpOrig.y + distanceToMove * pv.y
          pt.x = rpHinted.x
          pt.y = rpHinted.y
          distanceBetweenPoints = distanceToMove
        } else {
          const dv = this.dualProjVec()
          const rpOrig = this.zonesOriginal[this.gs.zp0][rp0]
          const ptOrig = this.zonesOriginal[this.gs.zp1][pointIndex]
          distanceBetweenPoints =
            dv.x * (ptOrig.x - rpOrig.x) + dv.y * (ptOrig.y - rpOrig.y)
        }

        // Auto-flip: if CVT value and measured distance have opposite signs, negate
        if (
          this.gs.autoFlip &&
          distanceToMove < 0 !== distanceBetweenPoints < 0
        ) {
          distanceToMove = -distanceToMove
        }

        if (roundAndCutInFlag) {
          distanceToMove = this.roundAndCutIn(
            this.compensate(distanceToMove, distType),
            distanceBetweenPoints,
          )
        }

        if (useMinDist) {
          distanceToMove = clampToMinimumDistance(
            this.gs.minimumDistance,
            distanceToMove,
            distanceBetweenPoints < 0,
          )
        }

        const currentDist =
          pv.x * (pt.x - rpHinted.x) + pv.y * (pt.y - rpHinted.y)
        const mirpDelta = distanceToMove - currentDist
        this.movePoint(this.gs.zp1, pointIndex, mirpDelta)

        this.gs.rp1 = rp0
        this.gs.rp2 = pointIndex
        if (setRp0) this.gs.rp0 = pointIndex

        break
      }

      case Opcode.ALIGNRP: {
        const rp0 = this.gs.rp0
        const rpHinted = this.zones[this.gs.zp0][rp0]
        const pv = this.gs.projectionVector
        const rpProj = pv.x * rpHinted.x + pv.y * rpHinted.y

        const points = this.loop()
        for (const p of points) {
          const pt = this.zones[this.gs.zp1][p]
          const ptProj = pv.x * pt.x + pv.y * pt.y
          // Move p so its projection equals rp0's projection (delta = 0 distance)
          this.movePoint(this.gs.zp1, p, rpProj - ptProj)
        }

        break
      }

      case Opcode.AA: {
        // deprecated opcode, just pop from the stack
        this.stack.pop()
        break
      }

      case Opcode.ISECT: {
        // Stack (top to bottom): b1, b0, a1, a0, p
        // Line A through a0, a1 (from zp1); line B through b0, b1 (from zp0)
        const b1 = this.stack.popU32()
        const b0 = this.stack.popU32()
        const a1 = this.stack.popU32()
        const a0 = this.stack.popU32()
        const p = this.stack.popU32()

        const pA0 = this.zones[this.gs.zp1][a0]
        const pA1 = this.zones[this.gs.zp1][a1]
        const pB0 = this.zones[this.gs.zp0][b0]
        const pB1 = this.zones[this.gs.zp0][b1]
        const pt = this.zones[this.gs.zp2][p]

        const dAx = pA0.x - pA1.x
        const dAy = pA0.y - pA1.y
        const dBx = pB0.x - pB1.x
        const dBy = pB0.y - pB1.y

        // Midpoint fallback for parallel/degenerate cases
        const midX = (pA0.x + pA1.x + pB0.x + pB1.x) / 4
        const midY = (pA0.y + pA1.y + pB0.y + pB1.y) / 4

        let nx: number
        let ny: number

        if (dAy === 0 && dAx === 0) {
          nx = midX
          ny = midY
        } else if (dAy === 0) {
          if (dBx === 0) {
            nx = pB1.x
            ny = pA1.y
          } else {
            const n = pB1.y - pA1.y
            const d = -dBy
            if (d === 0) {
              nx = midX
              ny = midY
            } else {
              const t = n / d
              nx = pB1.x + dBx * t
              ny = pB1.y + dBy * t
            }
          }
        } else if (dAx === 0) {
          if (dBy === 0) {
            nx = pA1.x
            ny = pB1.y
          } else {
            const n = pB1.x - pA1.x
            const d = -dBx
            if (d === 0) {
              nx = midX
              ny = midY
            } else {
              const t = n / d
              nx = pB1.x + dBx * t
              ny = pB1.y + dBy * t
            }
          }
        } else {
          const D = dBx * dAy - dBy * dAx
          if (D === 0) {
            nx = midX
            ny = midY
          } else {
            const N = (pB1.y - pA1.y) * dAx - (pB1.x - pA1.x) * dAy
            const t = N / D
            nx = pB1.x + dBx * t
            ny = pB1.y + dBy * t
          }
        }

        pt.x = nx
        pt.y = ny
        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/tt_instructions#align-points
      case Opcode.ALIGNPTS: {
        // p1 from zp1, p2 from zp0
        const p1 = this.stack.popU32()
        const p2 = this.stack.popU32()

        const pv = this.gs.projectionVector
        const pt1 = this.zones[this.gs.zp1][p1]
        const pt2 = this.zones[this.gs.zp0][p2]

        // Distance between the two points along projection vector
        const dist = pv.x * (pt2.x - pt1.x) + pv.y * (pt2.y - pt1.y)
        // Move each point half the distance toward the other
        const move = Math.trunc(dist / 2)

        this.movePoint(this.gs.zp1, p1, move)
        this.movePoint(this.gs.zp0, p2, move - dist)
        break
      }

      case Opcode.IP: {
        const rp1 = this.gs.rp1
        const rp2 = this.gs.rp2
        const dv = this.dualProjVec()
        const pv = this.gs.projectionVector

        // Reference point positions (hinted)
        const ref1Hinted = this.zones[this.gs.zp0][rp1]
        const ref2Hinted = this.zones[this.gs.zp1][rp2]

        // Reference point positions (original/scaled for dual projection)
        const ref1Orig = this.zonesOriginal[this.gs.zp0][rp1]
        const ref2Orig = this.zonesOriginal[this.gs.zp1][rp2]

        // Ranges in hinted space and original space along the projection vectors
        const currentRange =
          pv.x * (ref2Hinted.x - ref1Hinted.x) +
          pv.y * (ref2Hinted.y - ref1Hinted.y)
        const oldRange =
          dv.x * (ref2Orig.x - ref1Orig.x) + dv.y * (ref2Orig.y - ref1Orig.y)

        const points = this.loop()
        for (const p of points) {
          const ptHinted = this.zones[this.gs.zp2][p]
          const ptOrig = this.zonesOriginal[this.gs.zp2][p]

          // Desired projection in original space (relative to ref1)
          const origRef1Proj = dv.x * ref1Orig.x + dv.y * ref1Orig.y
          const ptOrigProj = dv.x * ptOrig.x + dv.y * ptOrig.y
          let desiredProjection = ptOrigProj - origRef1Proj

          if (oldRange !== 0) {
            // Scale: desiredProjection = desiredProjection * currentRange / oldRange
            desiredProjection = (desiredProjection * currentRange) / oldRange
          }

          // Current projection relative to ref1
          const ref1HintedProj = pv.x * ref1Hinted.x + pv.y * ref1Hinted.y
          const currentProjection =
            pv.x * ptHinted.x + pv.y * ptHinted.y - ref1HintedProj

          this.movePoint(this.gs.zp2, p, desiredProjection - currentProjection)
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
        // IUP0 = y axis (0x30), IUP1 = x axis (0x31)
        const useX = Boolean(opcode & 0b1)
        this.interpolateUntouchedPoints(useX)
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
        // k is 1-indexed from the top; convert to 0-indexed from bottom
        this.stack.push(this.stack.at(this.stack.depth() - k))
        break
      }

      case Opcode.MINDEX: {
        const k = this.stack.pop()
        // k is 1-indexed from the top; convert to 0-indexed from bottom
        const value = this.stack.delete(this.stack.depth() - k)
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
          error('unterminated IF block')
        }

        break
      }

      case Opcode.ELSE: {
        let depth = 0
        while (this.pc < inst.length) {
          const next = this.seekOne(inst)
          if (next === Opcode.IF) {
            ++depth
          } else if (next === Opcode.EIF) {
            if (depth === 0) break
            --depth
          }
        }
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
        const e1 = this.round(this.stack.pop26dot6())
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
        const distanceType = asDistanceType(opcode & 0b11)
        const n1 = this.stack.pop26dot6()
        const n2 = this.round(this.compensate(n1, distanceType))
        this.stack.push26dot6(n2)
        break
      }

      case Opcode.NROUND0:
      case Opcode.NROUND1:
      case Opcode.NROUND2:
      case Opcode.NROUND3: {
        // No engine characteristics in this implementation; value passes through unchanged.
        const n1 = this.stack.pop()
        this.stack.push(n1)
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
        // Apple: silently ignore calls to undefined functions (matching the
        // original C interpreter's "quietly returned if not yet defined" behaviour).
        if (fn) this.run(fn.inst, fn.pc)
        break
      }

      case Opcode.LOOPCALL: {
        const f = this.stack.pop()
        const count = this.stack.pop()
        const fn = this.fns[f]
        // Same leniency as CALL.
        if (fn) {
          for (let i = 0; i < count; ++i) {
            this.run(fn.inst, fn.pc)
          }
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
          result |= 7
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
          result |= 1 << 11
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

      case Opcode.GETDATA: {
        // Apple implementation: type 1 = random number; anything else = failure
        const type = this.stack.pop()
        let success = false
        if (type === 1) {
          const n = this.stack.popU32()
          if (n !== 0) {
            this.stack.push(17 % n) // "fair dice roll" constant from Apple
            success = true
          }
        }
        this.stack.push(success ? 1 : 0)
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

    error(
      `Expected ${opcodes.map((o) => Opcode[o]).join(' or ')} but reached the end of the program`,
    )
  }

  private seekOne(inst: Uint8Array): Opcode {
    const next = inst[this.pc]
    this.pc += opcodeLength(inst, this.pc)
    return next
  }

  private delta(offset: number, cb: (i: number, magnitude: number) => void) {
    const n = this.stack.popU32()
    const pairs = range(n, () => [this.stack.popU32(), this.stack.popU32()])

    const ppem = Math.round(this.fontSize)

    if (ppem < this.gs.deltaBase + offset) return
    if (ppem >= this.gs.deltaBase + 16 + offset) return

    const step = 1 / 2 ** this.gs.deltaShift

    for (const [i, arg] of pairs) {
      const targetPpem = ((arg >>> 4) & 0b1111) + this.gs.deltaBase + offset
      if (targetPpem !== ppem) continue
      const magnitude = deltaValue(arg & 0b1111) * step

      cb(i, magnitude)
    }
  }

  private round(value: number) {
    switch (this.gs.roundState) {
      case RoundState.HALF_GRID:
        return symmetricRound(value + 0.5) - 0.5
      case RoundState.GRID:
        return symmetricRound(value)
      case RoundState.DOUBLE_GRID:
        return symmetricRound(value * 2) / 2
      case RoundState.DOWN_TO_GRID:
        return symmetricFloor(value)
      case RoundState.UP_TO_GRID:
        return symmetricCeil(value)
      case RoundState.OFF:
        return value
      case RoundState.CUSTOM: {
        const { period, phase, threshold } = this.gs.roundStateCustom

        const rounded =
          symmetricFloor((value - phase + threshold) / period) * period + phase

        // TODO: verify this is okay
        return (
          value > 0 && rounded < 0 ? phase
          : value < 0 && rounded > 0 ?
            phase === 0 ?
              phase
            : -period + phase
          : rounded
        )
      }
      default:
        error(`Invalid round state value ${this.gs.roundState as any}`)
    }
  }

  private compensate(value: number, distanceType: DistanceType) {
    switch (distanceType) {
      case DistanceType.GRAY:
        return value
      case DistanceType.BLACK:
        return value + this.compensation.black
      case DistanceType.WHITE:
        return value + this.compensation.white
    }
  }

  /** Returns the dual projection vector, falling back to projectionVector if not set. */
  private dualProjVec() {
    return this.gs.dualProjectionVector ?? this.gs.projectionVector
  }

  /**
   * Moves a point by `delta` (measured along the projection vector) in the direction
   * of the freedom vector. Accounts for the dot product between the two vectors.
   */
  private movePoint(zoneIdx: number, pointIdx: number, delta: number) {
    const { freedomVector: fv, projectionVector: pv } = this.gs

    let pDotF = pv.x * fv.x + pv.y * fv.y

    // If the vectors are nearly orthogonal, clamp to avoid degenerate division.
    // Apple uses 1/16 as the minimum magnitude threshold.
    if (pDotF !== 0 && Math.abs(pDotF) < 1 / 16) {
      pDotF = pDotF < 0 ? -1 : 1
    } else if (pDotF === 0) {
      pDotF = 1
    }

    const pt = this.zones[zoneIdx][pointIdx]
    const dy = (delta * fv.y) / pDotF
    pt.x += (delta * fv.x) / pDotF
    pt.y += dy

    this.touched[zoneIdx].add(pointIdx)
  }

  /**
   * Returns a unit vector from p1 to p2, optionally rotated 90° CCW.
   * Falls back to (1, 0) if p1 === p2 (zero-length line).
   */
  private unitVectorFromPoints(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    rotate: boolean,
  ): { x: number; y: number } {
    let dx = p2.x - p1.x
    let dy = p2.y - p1.y
    const m = Math.hypot(dx, dy)

    if (m === 0) {
      // Zero-length line: default to x-axis
      return rotate ? { x: 0, y: 1 } : { x: 1, y: 0 }
    }

    dx /= m
    dy /= m

    if (rotate) {
      return { x: -dy, y: dx }
    }
    return { x: dx, y: dy }
  }

  /** Applies single-width cut-in: if distance is close to singleWidthValue, snap to it. */
  private applySingleWidthCutIn(distance: number): number {
    const swci = this.gs.singeWidthCutIn
    if (swci === 0) return distance
    const sw = Math.abs(this.gs.singleWidthValue)
    if (Math.abs(Math.abs(distance) - sw) < swci) {
      return distance < 0 ? -sw : sw
    }
    return distance
  }

  /**
   * Rounds distanceToMove, applying CVT cut-in: if the distance deviates from
   * distanceBetweenPoints by more than controlValueCutIn, use distanceBetweenPoints.
   */
  private roundAndCutIn(
    distanceToMove: number,
    distanceBetweenPoints: number,
  ): number {
    const cut = Math.abs(distanceToMove - distanceBetweenPoints)
    if (cut > this.gs.controlValueCutIn) {
      distanceToMove = distanceBetweenPoints
    }
    return this.round(distanceToMove)
  }

  /** IUP: interpolate untouched points along x (useX=true) or y (useX=false) axis. */
  private interpolateUntouchedPoints(useX: boolean) {
    const zone = this.zones[1] // IUP always operates on zone 1 (glyph zone)
    const origZone = this.zonesOriginal[1]
    const touched = this.touched[1]
    const contours = this.glyph.endPtsOfContours

    let contourStart = 0
    for (const contourEnd of contours) {
      const contourLen = contourEnd - contourStart + 1

      if (contourLen === 0) {
        contourStart = contourEnd + 1
        continue
      }

      // Find first touched point in this contour
      let firstTouched = -1
      for (let i = contourStart; i <= contourEnd; i++) {
        if (touched.has(i)) {
          firstTouched = i
          break
        }
      }

      if (firstTouched === -1) {
        // No touched points in this contour; leave untouched points as-is
        contourStart = contourEnd + 1
        continue
      }

      // Walk the contour starting from the first touched point
      let refStart = firstTouched
      let refEnd = firstTouched

      do {
        // Advance refEnd to next touched point (wrapping within contour)
        let next = refEnd
        do {
          next = next === contourEnd ? contourStart : next + 1
          if (next === refStart) break
        } while (!touched.has(next))

        refEnd = next

        if (refStart === refEnd) {
          // Only one touched point: shift all untouched by this point's delta
          const origCoord = useX ? origZone[refStart].x : origZone[refStart].y
          const hintedCoord = useX ? zone[refStart].x : zone[refStart].y
          const delta = hintedCoord - origCoord

          for (let i = contourStart; i <= contourEnd; i++) {
            if (!touched.has(i)) {
              if (useX) zone[i].x += delta
              else zone[i].y += delta
            }
          }
          break
        }

        // Interpolate untouched points between refStart and refEnd
        const origLow = useX ? origZone[refStart].x : origZone[refStart].y
        const origHigh = useX ? origZone[refEnd].x : origZone[refEnd].y

        const [lowIdx, highIdx] =
          origLow <= origHigh ? [refStart, refEnd] : [refEnd, refStart]
        const origMin = useX ? origZone[lowIdx].x : origZone[lowIdx].y
        const origMax = useX ? origZone[highIdx].x : origZone[highIdx].y
        const hintedMin = useX ? zone[lowIdx].x : zone[lowIdx].y
        const hintedMax = useX ? zone[highIdx].x : zone[highIdx].y
        const dMin =
          hintedMin - (useX ? origZone[lowIdx].x : origZone[lowIdx].y)
        const dMax =
          hintedMax - (useX ? origZone[highIdx].x : origZone[highIdx].y)

        // Walk from refStart+1 to refEnd-1 (wrapping)
        let i = refStart
        while (true) {
          i = i === contourEnd ? contourStart : i + 1
          if (i === refEnd) break
          if (touched.has(i)) continue

          const origCoord = useX ? origZone[i].x : origZone[i].y
          let newCoord: number

          if (origCoord <= origMin) {
            newCoord = (useX ? zone[i].x : zone[i].y) + dMin
          } else if (origCoord >= origMax) {
            newCoord = (useX ? zone[i].x : zone[i].y) + dMax
          } else {
            // Linear interpolation in original space, applied in hinted space
            const ratio =
              origMax - origMin !== 0 ?
                (origCoord - origMin) / (origMax - origMin)
              : 0
            newCoord = hintedMin + ratio * (hintedMax - hintedMin)
          }

          if (useX) zone[i].x = newCoord
          else zone[i].y = newCoord
        }

        refStart = refEnd
      } while (refStart !== firstTouched)

      contourStart = contourEnd + 1
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
