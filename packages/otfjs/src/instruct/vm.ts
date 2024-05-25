import * as vec from '../vector.js'
import { GlyphSimple } from '../tables/glyf.js'
import { MaxpTable10 } from '../tables/maxp.js'
import { assert, debug, range } from '../utils.js'
import { makeGraphicsState } from './graphics.js'
import { Opcode } from './opcode.js'
import { Stack } from './stack.js'
import { getinfoFlags } from './utils.js'

export function process(
  inst: Uint8Array,
  maxp: MaxpTable10,
  cvt: number[],
  glyph: GlyphSimple,
  fns: Int32Array,
) {
  const view = new DataView(inst.buffer, inst.byteOffset)
  const store = new DataView(new ArrayBuffer(maxp.maxStorage * 4))
  const stack = new Stack(maxp.maxStackElements)
  const gs = makeGraphicsState()
  const zonesOriginal = [
    range(maxp.maxTwilightPoints, () => ({ x: 0, y: 0, onCurve: true })),
    // TODO: am I supposed to add 4 extra points here?
    [...glyph.points],
  ]
  const zones = structuredClone(zonesOriginal)
  const touched = range(zones.length, () => new Set<number>())

  // affects ALIGNRP, FLIPPT, IP, SHP, SHPIX
  function loop() {
    const points = range(gs.loop, () => stack.popU32())
    gs.loop = 1
    return points
  }

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

        let v = vec.normalize(vec.subtract(p2, p1))

        if (rotate) {
          v = vec.rotate90(v)
        }

        // TODO: need to keep track of zones before anything has changed, and set both here
        // sounds like the dual one gets set and then is used in place of the projection vector
        // until the next instruction that sets the projection vector

        gs.dualProjectionVectors = v
        gs.projectionVector = v
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
        assert(value > 0, 'SLOOP must be greater than 0')
        gs.loop = value
        break
      }

      case Opcode.SMD: {
        const value = stack.pop26dot6()
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
        const value = stack.pop26dot6()
        gs.controlValueCutIn = value
        break
      }

      case Opcode.SSWCI: {
        const value = stack.pop26dot6()
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
        stack.push26dot6(12)
        break
      }

      case Opcode.FLIPPT: {
        const points = loop()

        for (const p of points) {
          const point = zones[gs.zp0][p]
          point.onCurve = !point.onCurve
        }

        break
      }

      case Opcode.FLIPRGON:
      case Opcode.FLIPRGOFF: {
        const on = opcode === Opcode.FLIPRGON
        const hp = stack.popU32()
        const lp = stack.popU32()
        for (let i = lp; i <= hp; ++i) {
          const point = zones[gs.zp0][i]
          point.onCurve = on
        }

        break
      }

      case Opcode.SHP0:
      case Opcode.SHP1: {
        const a = opcode & 0b1
        const rp = a === 0 ? gs.rp2 : gs.rp1
        const z = a === 0 ? gs.zp1 : gs.zp0

        const refo = zonesOriginal[z][rp]
        const refm = zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          gs.projectionVector,
        )
        const dv = vec.scale(gs.freedomVector, dist)

        const points = loop()
        for (const p of points) {
          const point = zones[gs.zp2][p]
          touched[gs.zp2].add(p)

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
        const rp = a === 0 ? gs.rp2 : gs.rp1
        const z = a === 0 ? gs.zp1 : gs.zp0

        const refo = zonesOriginal[z][rp]
        const refm = zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          gs.projectionVector,
        )
        const dv = vec.scale(gs.freedomVector, dist)

        const c = stack.popU32()

        const start = c === 0 ? 0 : glyph.endPtsOfContours[c - 1] + 1
        const end = glyph.endPtsOfContours[c]

        const skip = z === gs.zp2 ? { ...refm } : null
        const skipTouch = skip ? touched[gs.zp2].has(rp) : false

        for (let i = start; i <= end; ++i) {
          const point = zones[gs.zp2][i]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          touched[gs.zp2].add(i)
        }

        if (skip) {
          // if the reference point is on the contour, it should not be updated
          zones[gs.zp2][rp] = skip
          if (!skipTouch) {
            touched[gs.zp2].delete(rp)
          }
        }

        break
      }

      case Opcode.SHZ0:
      case Opcode.SHZ1: {
        const a = opcode & 0b1
        const rp = a === 0 ? gs.rp2 : gs.rp1
        const z = a === 0 ? gs.zp1 : gs.zp0

        const refo = zonesOriginal[z][rp]
        const refm = zones[z][rp]

        // measure the relative distance of the reference point
        // along the projection vector
        const dist = vec.projectLength(
          vec.subtract(refm, refo),
          gs.projectionVector,
        )
        const dv = vec.scale(gs.freedomVector, dist)

        const e = stack.popU32()

        const skip = z === e ? { ...refm } : null
        const skipTouch = skip ? touched[e].has(rp) : false

        for (let i = 0; i < zones[e].length; ++i) {
          const point = zones[e][i]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          touched[e].add(i)
        }

        if (skip) {
          // if the reference point is on the zone, it should not be updated
          zones[e][rp] = skip
          if (!skipTouch) {
            touched[e].delete(rp)
          }
        }

        break
      }

      case Opcode.SHPIX: {
        const points = loop()
        const magnitude = stack.pop26dot6()
        const dv = vec.scale(gs.freedomVector, magnitude)

        for (const p of points) {
          const point = zones[gs.zp2][p]
          const newPoint = vec.add(point, dv)
          point.x = newPoint.x
          point.y = newPoint.y
          touched[gs.zp2].add(p)
        }

        break
      }

      case Opcode.MSIRP0:
      case Opcode.MSIRP1: {
        const a = opcode & 0b1
        const d = stack.pop26dot6()
        const p = stack.popU32()

        const point = zones[gs.zp1][p]
        const ref = zones[gs.zp0][gs.rp0]

        // find the distance by projecting freedom vector onto projection vector
        // TODO: I don't think this logic is correct
        const proj = vec.projectOnto(point, gs.projectionVector)
        const currentDistance = vec.magnitude(proj)
        const scale = d / currentDistance
        const newPoint = vec.scale(point, scale)

        point.x = newPoint.x
        point.y = newPoint.y
        touched[gs.zp1].add(p)

        gs.rp1 = gs.rp0
        gs.rp2 = p

        if (a === 1) {
          gs.rp0 = p
        }

        break
      }

      case Opcode.MDAP0:
      case Opcode.MDAP1: {
        const round = (opcode & 0b1) === 1
        const p = stack.popU32()

        if (round) {
          // TODO: need to figure out rounding rules
        }

        // TODO: touch needs to be direction aware (i.e. if the freedom vector
        // is orthogonal, only the pointed direction is marked touched)
        touched[gs.zp0].add(p)

        gs.rp0 = gs.rp1 = p

        break
      }

      case Opcode.MIAP0:
      case Opcode.MIAP1: {
        const round = (opcode & 0b1) === 1
        const n = stack.popU32()
        const p = stack.popU32()

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
        const p = stack.popU32()

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
        const n = stack.popU32()
        const p = stack.popU32()

        // TODO: this instruction

        break
      }

      case Opcode.ALIGNRP: {
        const points = loop()
        const rp = zones[gs.zp0][gs.rp0]

        for (const p of points) {
          const point = zones[gs.zp1][p]
          // TODO: reduce measured distance to 0 along projection vector
        }

        break
      }

      case Opcode.AA: {
        // deprecated opcode, just pop from the stack
        stack.pop()
        break
      }

      case Opcode.ISECT: {
        const b1 = stack.popU32()
        const b0 = stack.popU32()
        const a1 = stack.popU32()
        const a0 = stack.popU32()
        const p = stack.popU32()

        // If lines A and B are parallel, point p is moved to a position in the middle of the lines. That is:
        // px = (a0x + a1x)/4 + (b0x + b1x)/4
        // py = (a0y + a1y)/4 + (b0y + b1y)/4

        // TODO: this instruction

        break
      }

      // https://learn.microsoft.com/en-us/typography/opentype/spec/tt_instructions#align-points
      case Opcode.ALIGNPTS: {
        const p1 = stack.popU32()
        const p2 = stack.popU32()

        // TODO: this instruction
        break
      }

      case Opcode.IP: {
        const points = loop()
        for (const p of points) {
          // TODO: this instruction
        }

        break
      }

      case Opcode.UTP: {
        const p = stack.popU32()
        // TODO: need to do this along the freedom vector
        touched[gs.zp0].delete(p)
        break
      }

      case Opcode.IUP0:
      case Opcode.IUP1: {
        const a = opcode & 0b1
        // TODO: this instruction
        break
      }

      // TODO: handle delta instructions

      case Opcode.DUP: {
        const e = stack.pop()
        stack.push(e)
        stack.push(e)
        break
      }

      case Opcode.POP: {
        stack.pop()
        break
      }

      case Opcode.CLEAR: {
        stack.clear()
        break
      }

      case Opcode.SWAP: {
        const e2 = stack.pop()
        const e1 = stack.pop()
        stack.push(e2)
        stack.push(e1)
        break
      }

      case Opcode.DEPTH: {
        stack.push(stack.depth())
        break
      }

      case Opcode.CINDEX: {
        const k = stack.pop()
        stack.push(stack.at(k))
        break
      }

      case Opcode.MINDEX: {
        const k = stack.pop()
        const value = stack.delete(k)
        stack.push(value)
        break
      }

      case Opcode.ROLL: {
        const a = stack.pop()
        const b = stack.pop()
        const c = stack.pop()
        stack.push(b)
        stack.push(a)
        stack.push(c)
      }

      case Opcode.IF: {
        const e = stack.popU32()
        if (e === 0) {
          // skip to the next ELSE or EIF
          // TODO: need to account for length of push instructions
          while (inst[pc] !== Opcode.ELSE && inst[pc] !== Opcode.EIF) {
            pc++
          }
        }
        // else continue into the block
        break
      }

      case Opcode.ELSE: {
        // skip to the next EIF
        while (inst[pc] !== Opcode.EIF) {
          pc++
        }
        break
      }

      case Opcode.EIF: {
        // end of an IF block
        break
      }

      case Opcode.JROT: {
        const e = stack.popU32()
        const offset = stack.pop()

        if (e !== 0) {
          pc += offset - 1
        }

        break
      }

      case Opcode.JMPR: {
        pc += stack.pop() - 1
        break
      }

      case Opcode.JROF: {
        const e = stack.popU32()
        const offset = stack.pop()

        if (e === 0) {
          pc += offset - 1
        }

        break
      }

      case Opcode.LT: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 < e2 ? 1 : 0)
        break
      }

      case Opcode.LTEQ: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 <= e2 ? 1 : 0)
        break
      }

      case Opcode.GT: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 > e2 ? 1 : 0)
        break
      }

      case Opcode.GTEQ: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 >= e2 ? 1 : 0)
        break
      }

      case Opcode.EQ: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 === e2 ? 1 : 0)
        break
      }

      case Opcode.NEQ: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(e1 !== e2 ? 1 : 0)
        break
      }

      case Opcode.ODD:
      case Opcode.EVEN: {
        const even = opcode === Opcode.EVEN
        const e1 = stack.pop26dot6()
        // TODO: need to round first
        const isEven = e1 % 2 === 0
        stack.push(Number(even === isEven))
        break
      }

      case Opcode.AND: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(Number(Boolean(e1 && e2)))
        break
      }

      case Opcode.OR: {
        const e2 = stack.popU32()
        const e1 = stack.popU32()
        stack.push(Number(Boolean(e1 || e2)))
        break
      }

      case Opcode.NOT: {
        const e = stack.popU32()
        stack.push(Number(!e))
      }

      case Opcode.ADD: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        stack.push26dot6(n1 + n2)
        break
      }

      case Opcode.SUB: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        stack.push26dot6(n1 - n2)
        break
      }

      case Opcode.DIV: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        // TODO: handle divide by 0
        stack.push26dot6(n1 / n2)
        break
      }

      case Opcode.MUL: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        stack.push26dot6(n1 * n2)
        break
      }

      case Opcode.ABS: {
        const n = stack.pop26dot6()
        stack.push26dot6(Math.abs(n))
        break
      }

      case Opcode.NEG: {
        const n = stack.pop26dot6()
        stack.push26dot6(-n)
        break
      }

      case Opcode.FLOOR: {
        const n = stack.pop26dot6()
        stack.push26dot6(Math.floor(n))
        break
      }

      case Opcode.CEILING: {
        const n = stack.pop26dot6()
        stack.push26dot6(Math.ceil(n))
        break
      }

      case Opcode.MAX: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        stack.push26dot6(Math.max(n1, n2))
        break
      }

      case Opcode.MIN: {
        const n2 = stack.pop26dot6()
        const n1 = stack.pop26dot6()
        stack.push26dot6(Math.min(n1, n2))
        break
      }

      case Opcode.ROUND0:
      case Opcode.ROUND1:
      case Opcode.ROUND2:
      case Opcode.ROUND3: {
        const ab = opcode & 0b11
        const n1 = stack.pop()

        // TODO: do I need to do anything here? might be cool to be able to
        // define an "engine characteristic" here for experimentation

        // TODO: round n2 based on round_state
        const n2 = n1
        stack.push(n2)

        break
      }

      case Opcode.NROUND0:
      case Opcode.NROUND1:
      case Opcode.NROUND2:
      case Opcode.NROUND3: {
        const ab = opcode & 0b11
        const n1 = stack.pop()

        // TODO: do something with engine characteristic

        const n2 = n1
        stack.push(n2)

        break
      }

      case Opcode.FDEF: {
        const f = stack.pop()
        // TODO: need to know whether this is fpgm or cvgprogram
        fns[f] = pc

        while (inst[pc] !== Opcode.ENDF) {
          // TODO: skip over inst args
          pc += 1
        }

        // skip over ENDF instruction
        ++pc

        break
      }

      case Opcode.ENDF: {
        break
      }

      case Opcode.CALL: {
        const f = stack.pop()
        break
      }

      case Opcode.LOOPCALL: {
        const f = stack.pop()
        const count = stack.pop()

        for (let i = 0; i < count; ++i) {}

        break
      }

      case Opcode.IDEF: {
        const opcode = stack.popU32()

        while (inst[pc] !== Opcode.ENDF) {
          // TODO: skip over inst args
          pc += 1
        }

        // skip over ENDF instruction
        ++pc

        // TODO: store this idef somewhere
        break
      }

      case Opcode.DEBUG: {
        const n = stack.popU32()
        console.log(debug(n))
        break
      }

      case Opcode.GETINFO: {
        const flags = getinfoFlags(stack.pop())
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

        break
      }

      case Opcode.GETVARIATION: {
        // TODO: this instruction
        stack.push(0)
        stack.push(0)
        break
      }
    }
  }
}
