// Type 2 charstrings, the glyph programs in a CFF table.
// https://adobe-type-tools.github.io/font-tech-notes/pdfs/5177.Type2.pdf

import type { PathBuilder } from '../path-builder.js'
import { assert } from '../utils/utils.js'
import type { CffIndex } from './cff.index.js'

export interface CharStringContext {
  globalSubrs: CffIndex
  /** The Private DICT's Subrs, if it has any. */
  localSubrs: CffIndex | null
  /** The advance width of glyphs whose charstring doesn't give one. */
  defaultWidthX: number
  /** Added to the width a charstring gives. */
  nominalWidthX: number
}

// The spec's limits
const MAX_STACK = 48
const MAX_SUBR_DEPTH = 10

/**
 * Run a glyph's charstring, drawing its outline into `path`. Returns the
 * glyph's advance width.
 *
 * Hints are read only as far as needed to skip the hint mask bytes. The
 * deprecated accented character form of `endchar`, which takes four extra
 * operands, draws just the base glyph's own outline.
 */
export function runCharString(
  charString: Uint8Array,
  ctx: CharStringContext,
  path: PathBuilder,
): number {
  const stack: number[] = []
  const transient: number[] = []
  const globalBias = subrBias(ctx.globalSubrs.count)
  const localBias = subrBias(ctx.localSubrs?.count ?? 0)

  let x = 0
  let y = 0
  let open = false
  let stems = 0
  let width = ctx.defaultWidthX
  let haveWidth = false
  let ended = false

  // Only the first stack-clearing operator can carry a width, as an extra
  // first operand.
  const takeWidth = (hasWidth: boolean) => {
    if (haveWidth) return
    haveWidth = true
    if (hasWidth) width = ctx.nominalWidthX + stack.shift()!
  }

  const addStems = () => {
    takeWidth(stack.length % 2 === 1)
    stems += stack.length >> 1
  }

  const moveTo = (dx: number, dy: number) => {
    if (open) path.closePath()
    x += dx
    y += dy
    path.moveTo({ x, y })
    open = true
  }

  const lineTo = (dx: number, dy: number) => {
    x += dx
    y += dy
    path.lineTo({ x, y })
  }

  const curveTo = (
    dxa: number,
    dya: number,
    dxb: number,
    dyb: number,
    dxc: number,
    dyc: number,
  ) => {
    const x1 = x + dxa
    const y1 = y + dya
    const x2 = x1 + dxb
    const y2 = y1 + dyb
    x = x2 + dxc
    y = y2 + dyc
    path.cubicCurveTo({ x: x1, y: y1 }, { x: x2, y: y2 }, { x, y })
  }

  // Lines that alternate between horizontal and vertical
  const alternatingLines = (horizontal: boolean) => {
    for (const d of stack) {
      if (horizontal) lineTo(d, 0)
      else lineTo(0, d)
      horizontal = !horizontal
    }
  }

  // Curves that alternate between starting horizontal and starting
  // vertical. The last curve can take a fifth operand, for the end
  // tangent's other direction.
  const alternatingCurves = (horizontal: boolean) => {
    const s = stack
    for (let k = 0; s.length - k >= 4; horizontal = !horizontal) {
      const last = s.length - k === 5 ? s[k + 4] : 0
      if (horizontal) curveTo(s[k], 0, s[k + 1], s[k + 2], last, s[k + 3])
      else curveTo(0, s[k], s[k + 1], s[k + 2], s[k + 3], last)
      k += s.length - k === 5 ? 5 : 4
    }
  }

  const pop = () => {
    assert(stack.length > 0, 'CFF charstring stack underflow')
    return stack.pop()!
  }

  const execute = (code: Uint8Array, depth: number) => {
    assert(depth <= MAX_SUBR_DEPTH, 'CFF subroutines nest too deeply')

    let i = 0
    while (i < code.length && !ended) {
      const b0 = code[i++]

      // Operands
      if (b0 >= 32 || b0 === 28) {
        let v: number
        if (b0 === 28) {
          v = ((code[i] << 24) >> 16) | code[i + 1]
          i += 2
        } else if (b0 <= 246) {
          v = b0 - 139
        } else if (b0 <= 250) {
          v = (b0 - 247) * 256 + code[i++] + 108
        } else if (b0 <= 254) {
          v = -(b0 - 251) * 256 - code[i++] - 108
        } else {
          // 16.16 fixed point
          v =
            ((code[i] << 24) |
              (code[i + 1] << 16) |
              (code[i + 2] << 8) |
              code[i + 3]) /
            65536
          i += 4
        }
        assert(stack.length < MAX_STACK, 'CFF charstring stack overflow')
        stack.push(v)
        continue
      }

      switch (b0) {
        case 1: // hstem
        case 3: // vstem
        case 18: // hstemhm
        case 23: // vstemhm
          addStems()
          break

        case 19: // hintmask
        case 20: // cntrmask
          // Operands here are vstems with the hm left off
          addStems()
          i += (stems + 7) >> 3
          break

        case 21: // rmoveto
          takeWidth(stack.length > 2)
          moveTo(stack[0], stack[1])
          break

        case 22: // hmoveto
          takeWidth(stack.length > 1)
          moveTo(stack[0], 0)
          break

        case 4: // vmoveto
          takeWidth(stack.length > 1)
          moveTo(0, stack[0])
          break

        case 5: // rlineto
          for (let k = 0; k + 1 < stack.length; k += 2) {
            lineTo(stack[k], stack[k + 1])
          }
          break

        case 6: // hlineto
          alternatingLines(true)
          break

        case 7: // vlineto
          alternatingLines(false)
          break

        case 8: // rrcurveto
          for (let k = 0; k + 5 < stack.length; k += 6) {
            curveTo(...six(stack, k))
          }
          break

        case 24: {
          // rcurveline: curves, then a line
          let k = 0
          for (; stack.length - k >= 8; k += 6) curveTo(...six(stack, k))
          lineTo(stack[k], stack[k + 1])
          break
        }

        case 25: {
          // rlinecurve: lines, then a curve
          let k = 0
          for (; stack.length - k >= 8; k += 2) lineTo(stack[k], stack[k + 1])
          curveTo(...six(stack, k))
          break
        }

        case 26: {
          // vvcurveto
          let k = 0
          let dx1 = stack.length % 2 === 1 ? stack[k++] : 0
          for (; k + 3 < stack.length; k += 4) {
            curveTo(dx1, stack[k], stack[k + 1], stack[k + 2], 0, stack[k + 3])
            dx1 = 0
          }
          break
        }

        case 27: {
          // hhcurveto
          let k = 0
          let dy1 = stack.length % 2 === 1 ? stack[k++] : 0
          for (; k + 3 < stack.length; k += 4) {
            curveTo(stack[k], dy1, stack[k + 1], stack[k + 2], stack[k + 3], 0)
            dy1 = 0
          }
          break
        }

        case 30: // vhcurveto
          alternatingCurves(false)
          break

        case 31: // hvcurveto
          alternatingCurves(true)
          break

        case 10: {
          // callsubr
          assert(ctx.localSubrs !== null, 'CFF callsubr without local subrs')
          execute(ctx.localSubrs.get(pop() + localBias), depth + 1)
          continue
        }

        case 29: // callgsubr
          execute(ctx.globalSubrs.get(pop() + globalBias), depth + 1)
          continue

        case 11: // return
          return

        case 14: // endchar
          takeWidth(stack.length === 1 || stack.length === 5)
          ended = true
          break

        case 12:
          // arithmetic keeps its result on the stack
          if (!escape(code[i++])) continue
          break

        // reserved operators
        default:
          break
      }

      stack.length = 0
    }
  }

  // Two-byte operators. Returns whether to clear the stack after: path
  // operators do, and arithmetic leaves its result there.
  const escape = (b1: number): boolean => {
    switch (b1) {
      case 35: // flex
        curveTo(...six(stack, 0))
        curveTo(...six(stack, 6))
        break

      case 34: {
        // hflex
        const [dx1, dx2, dy2, dx3, dx4, dx5, dx6] = stack
        curveTo(dx1, 0, dx2, dy2, dx3, 0)
        curveTo(dx4, 0, dx5, -dy2, dx6, 0)
        break
      }

      case 36: {
        // hflex1
        const [dx1, dy1, dx2, dy2, dx3, dx4, dx5, dy5, dx6] = stack
        curveTo(dx1, dy1, dx2, dy2, dx3, 0)
        curveTo(dx4, 0, dx5, dy5, dx6, -(dy1 + dy2 + dy5))
        break
      }

      case 37: {
        // flex1: the last point moves along whichever axis the curves
        // moved further along overall, and returns to the start on the other
        let dx = 0
        let dy = 0
        for (let k = 0; k < 10; k += 2) {
          dx += stack[k]
          dy += stack[k + 1]
        }
        const d6 = stack[10]
        const [dx6, dy6] = Math.abs(dx) > Math.abs(dy) ? [d6, -dy] : [-dx, d6]
        curveTo(...six(stack, 0))
        curveTo(stack[6], stack[7], stack[8], stack[9], dx6, dy6)
        break
      }

      case 3: // and
        binary((a, b) => (a && b ? 1 : 0))
        return false
      case 4: // or
        binary((a, b) => (a || b ? 1 : 0))
        return false
      case 5: // not
        stack.push(pop() ? 0 : 1)
        return false
      case 9: // abs
        stack.push(Math.abs(pop()))
        return false
      case 10: // add
        binary((a, b) => a + b)
        return false
      case 11: // sub
        binary((a, b) => a - b)
        return false
      case 12: // div
        binary((a, b) => a / b)
        return false
      case 14: // neg
        stack.push(-pop())
        return false
      case 15: // eq
        binary((a, b) => (a === b ? 1 : 0))
        return false
      case 18: // drop
        pop()
        return false
      case 20: {
        // put
        const index = pop()
        transient[index] = pop()
        return false
      }
      case 21: // get
        stack.push(transient[pop()] ?? 0)
        return false
      case 22: {
        // ifelse
        const v2 = pop()
        const v1 = pop()
        const s2 = pop()
        const s1 = pop()
        stack.push(v1 <= v2 ? s1 : s2)
        return false
      }
      case 23: // random: any number in (0, 1]. Fixed, so outlines repeat.
        stack.push(0.5)
        return false
      case 24: // mul
        binary((a, b) => a * b)
        return false
      case 26: // sqrt
        stack.push(Math.sqrt(pop()))
        return false
      case 27: {
        // dup
        const v = pop()
        stack.push(v, v)
        return false
      }
      case 28: {
        // exch
        const b = pop()
        const a = pop()
        stack.push(b, a)
        return false
      }
      case 29: {
        // index
        const n = Math.max(0, pop())
        stack.push(stack[stack.length - 1 - n])
        return false
      }
      case 30: {
        // roll
        const j = pop()
        const n = pop()
        const items = stack.splice(stack.length - n, n)
        const shift = ((j % n) + n) % n
        stack.push(...items.slice(n - shift), ...items.slice(0, n - shift))
        return false
      }

      // dotsection (deprecated) and reserved operators
      default:
        break
    }

    return true
  }

  const binary = (fn: (a: number, b: number) => number) => {
    const b = pop()
    const a = pop()
    stack.push(fn(a, b))
  }

  execute(charString, 0)
  if (open) path.closePath()

  return width
}

/**
 * Subroutine numbers are stored minus a bias, so that the most used ones,
 * near the middle, take the fewest bytes.
 */
export function subrBias(count: number) {
  if (count < 1240) return 107
  if (count < 33900) return 1131
  return 32768
}

function six(stack: number[], k: number) {
  return stack.slice(k, k + 6) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
}
