import { describe, expect, it } from 'vitest'

import type { Font } from '../font.js'
import { Opcode } from './opcode.js'
import { VirtualMachine } from './vm.js'

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

function makeFont(
  opts: {
    maxStorage?: number
    maxStackElements?: number
    maxTwilightPoints?: number
    maxFunctionDefs?: number
    cvt?: number[]
  } = {},
): Font {
  const {
    maxStorage = 64,
    maxStackElements = 128,
    maxTwilightPoints = 8,
    maxFunctionDefs = 64,
    cvt = [],
  } = opts

  return {
    getTable: (tag: string) => {
      if (tag === 'maxp') {
        return {
          version: 0x00010000 as const,
          numGlyphs: 1,
          maxPoints: 64,
          maxContours: 8,
          maxCompositePoints: 0,
          maxCompositeContours: 0,
          maxZones: 2,
          maxTwilightPoints,
          maxStorage,
          maxFunctionDefs,
          maxInstructionDefs: 0,
          maxStackElements,
          maxSizeOfInstructions: 256,
          maxComponentElements: 0,
          maxComponentDepth: 0,
        }
      }
      throw new Error(`Table ${tag} not found`)
    },
    getTableOrNull: (tag: string) => {
      if (tag === 'cvt ') return cvt.length ? cvt : null
      return null
    },
    unitsPerEm: 1000,
  } as unknown as Font
}

function makeVM(opts: Parameters<typeof makeFont>[0] = {}): VirtualMachine {
  return new VirtualMachine(makeFont(opts))
}

/** Run a sequence of raw bytes as instructions, return the VM. */
function run(bytes: number[], opts: Parameters<typeof makeFont>[0] = {}): VirtualMachine {
  const vm = makeVM(opts)
  vm.run(new Uint8Array(bytes))
  return vm
}

/** Make a minimal GlyphSimple mock for testing. */
function makeGlyph(points: { x: number; y: number; onCurve: boolean }[], contours?: number[]) {
  const endPts = contours ?? [points.length - 1]
  return {
    type: 'simple' as const,
    xMin: 0, yMin: 0, xMax: 0, yMax: 0,
    endPtsOfContours: endPts,
    instructions: new Uint8Array(),
    points,
    contoursOverlap: false,
  }
}

/** Push a 26.6 value as bytes for NPUSHW (or just use PUSHB for integers ≤ 255). */
function f26(value: number): number {
  return Math.round(value * 64)
}

/** Encode an NPUSHB instruction for the given bytes. */
function npushb(...bytes: number[]): number[] {
  return [Opcode.NPUSHB, bytes.length, ...bytes]
}

/** Encode an NPUSHW instruction for the given 16-bit signed words. */
function npushw(...words: number[]): number[] {
  const result = [Opcode.NPUSHW, words.length]
  for (const w of words) {
    result.push((w >> 8) & 0xff, w & 0xff)
  }
  return result
}

/** Pop the top N items from the VM stack (top first). */
function stackTop(vm: VirtualMachine, n = 1): number[] {
  // Access the internal stack via the public interface
  const items: number[] = []
  for (let i = 0; i < n; i++) {
    items.push(vm.stack.pop())
  }
  return items
}

/** Pop the top item and interpret as 26.6 float. */
function stackTop26dot6(vm: VirtualMachine): number {
  const raw = vm.stack.pop()
  return raw / 64
}

// ---------------------------------------------------------------------------
// PUSH opcodes
// ---------------------------------------------------------------------------

describe('NPUSHB / PUSHB', () => {
  it('pushes N bytes', () => {
    const vm = run([Opcode.NPUSHB, 3, 10, 20, 30])
    expect(stackTop(vm, 3)).toEqual([30, 20, 10])
  })

  it('PUSHB0 pushes 1 byte', () => {
    const vm = run([Opcode.PUSHB0, 42])
    expect(stackTop(vm, 1)).toEqual([42])
  })

  it('PUSHB3 pushes 4 bytes', () => {
    const vm = run([Opcode.PUSHB3, 1, 2, 3, 4])
    expect(stackTop(vm, 4)).toEqual([4, 3, 2, 1])
  })
})

describe('NPUSHW / PUSHW', () => {
  it('pushes signed 16-bit words', () => {
    // NPUSHW 2, [0x0100, 0xff00]: 0x0100=256, 0xff00 as signed int16=-256
    const vm = run([Opcode.NPUSHW, 2, 0x01, 0x00, 0xff, 0x00])
    // Second word (0xff00 = -256) was pushed last, so it's on top
    expect(stackTop(vm, 2)).toEqual([-256, 256])
  })

  it('PUSHW0 pushes one word', () => {
    // -1 is 0xffff
    const vm = run([Opcode.PUSHW0, 0xff, 0xff])
    expect(stackTop(vm, 1)).toEqual([-1])
  })
})

// ---------------------------------------------------------------------------
// Stack operations
// ---------------------------------------------------------------------------

describe('DUP', () => {
  it('duplicates the top element', () => {
    const vm = run([...npushb(7), Opcode.DUP])
    expect(stackTop(vm, 2)).toEqual([7, 7])
  })
})

describe('POP', () => {
  it('removes the top element', () => {
    const vm = run([...npushb(5, 10), Opcode.POP])
    expect(stackTop(vm, 1)).toEqual([5])
  })
})

describe('CLEAR', () => {
  it('clears the entire stack', () => {
    const vm = run([...npushb(1, 2, 3), Opcode.CLEAR])
    expect(vm.stack.depth()).toBe(0)
  })
})

describe('SWAP', () => {
  it('swaps the top two elements', () => {
    const vm = run([...npushb(3, 7), Opcode.SWAP])
    expect(stackTop(vm, 2)).toEqual([3, 7])
  })
})

describe('DEPTH', () => {
  it('pushes stack depth', () => {
    const vm = run([...npushb(1, 2, 3), Opcode.DEPTH])
    const depth = stackTop(vm, 1)[0]
    expect(depth).toBe(3)
  })
})

describe('CINDEX', () => {
  it('copies element at index k (1-indexed from top)', () => {
    // Stack (bottom to top): 10, 20, 30. k=3 → copy element 3 from top = 10
    const vm = run([...npushb(10, 20, 30), ...npushb(3), Opcode.CINDEX])
    // After CINDEX: stack is 10, 20, 30, 10 (10 copied to top)
    expect(stackTop(vm, 1)).toEqual([10])
  })
})

describe('MINDEX', () => {
  it('moves element at index k to top (1-indexed from top)', () => {
    // Stack (bottom to top): 10, 20, 30. k=3 → move element 3 from top (=10) to top
    const vm = run([...npushb(10, 20, 30), ...npushb(3), Opcode.MINDEX])
    // Stack should now be: 20, 30, 10 (bottom to top)
    expect(stackTop(vm, 3)).toEqual([10, 30, 20])
  })
})

describe('ROLL', () => {
  it('rotates top 3 elements: [a, b, c] -> [b, a, c] (c on top)', () => {
    // push 1, 2, 3; top is 3, then 2, then 1
    const vm = run([...npushb(1, 2, 3), Opcode.ROLL])
    // ROLL: pop a=3, b=2, c=1; push b=2, a=3, c=1 → top is 1, then 3, then 2
    expect(stackTop(vm, 3)).toEqual([1, 3, 2])
  })
})

// ---------------------------------------------------------------------------
// Storage area
// ---------------------------------------------------------------------------

describe('RS / WS', () => {
  it('writes and reads storage', () => {
    // WS pops: value (top), index (below) → store[index] = value
    // Push index first (deeper), then value (top)
    const vm = run([
      ...npushb(5),  // index (pushed first = deeper)
      ...npushb(42), // value (pushed second = top)
      Opcode.WS,
      ...npushb(5),  // index
      Opcode.RS,
    ])
    expect(stackTop(vm, 1)).toEqual([42])
  })
})

// ---------------------------------------------------------------------------
// CVT operations
// ---------------------------------------------------------------------------

describe('WCVTP / RCVT', () => {
  it('writes pixel value to CVT and reads it back', () => {
    // WCVTP pops: value (top, F26.6), index (below)
    // Push index first (deeper), then value (top)
    const vm = run([
      ...npushb(0),         // CVT index 0 (deeper)
      ...npushw(f26(2.5)),  // 2.5 in 26.6 (top)
      Opcode.WCVTP,
      ...npushb(0),         // CVT index 0
      Opcode.RCVT,
    ])
    // RCVT pushes as 26.6, so value should be 2.5 * 64 = 160
    expect(stackTop(vm, 1)).toEqual([f26(2.5)])
  })
})

// ---------------------------------------------------------------------------
// Vector operations
// ---------------------------------------------------------------------------

describe('SVTCA', () => {
  it('SVTCA0 sets both vectors to Y axis', () => {
    const vm = run([Opcode.SVTCA0])
    expect(vm.gs.projectionVector).toEqual({ x: 0, y: 1 })
    expect(vm.gs.freedomVector).toEqual({ x: 0, y: 1 })
  })

  it('SVTCA1 sets both vectors to X axis', () => {
    const vm = run([Opcode.SVTCA1])
    expect(vm.gs.projectionVector).toEqual({ x: 1, y: 0 })
    expect(vm.gs.freedomVector).toEqual({ x: 1, y: 0 })
  })
})

describe('SPVTCA', () => {
  it('SPVTCA0 sets projection vector to Y axis', () => {
    const vm = run([Opcode.SPVTCA0])
    expect(vm.gs.projectionVector).toEqual({ x: 0, y: 1 })
    // freedom vector unchanged (default is x-axis)
    expect(vm.gs.freedomVector).toEqual({ x: 1, y: 0 })
  })

  it('SPVTCA1 sets projection vector to X axis', () => {
    const vm = run([Opcode.SPVTCA1])
    expect(vm.gs.projectionVector).toEqual({ x: 1, y: 0 })
  })
})

describe('SFVTCA', () => {
  it('SFVTCA0 sets freedom vector to Y axis', () => {
    const vm = run([Opcode.SFVTCA0])
    expect(vm.gs.freedomVector).toEqual({ x: 0, y: 1 })
    expect(vm.gs.projectionVector).toEqual({ x: 1, y: 0 }) // unchanged
  })

  it('SFVTCA1 sets freedom vector to X axis', () => {
    const vm = run([Opcode.SFVTCA1])
    expect(vm.gs.freedomVector).toEqual({ x: 1, y: 0 })
  })
})

describe('SFVTPV', () => {
  it('copies projection vector to freedom vector', () => {
    const vm = run([Opcode.SPVTCA0, Opcode.SFVTPV])
    expect(vm.gs.freedomVector).toEqual({ x: 0, y: 1 })
    expect(vm.gs.projectionVector).toEqual({ x: 0, y: 1 })
  })
})

describe('GPV / GFV', () => {
  it('GPV pushes projection vector components as 2.14 (x then y, y on top)', () => {
    const vm = run([Opcode.SPVTCA0, Opcode.GPV])
    // PV = (0, 1); GPV pushes x=0 then y=1 → y is on top
    const y = vm.stack.pop2dot14()  // top = y component
    const x = vm.stack.pop2dot14()  // next = x component
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(1, 5)
  })

  it('GFV pushes freedom vector components as 2.14 (x then y, y on top)', () => {
    const vm = run([Opcode.SFVTCA0, Opcode.GFV])
    const y = vm.stack.pop2dot14()
    const x = vm.stack.pop2dot14()
    expect(x).toBeCloseTo(0, 5)
    expect(y).toBeCloseTo(1, 5)
  })
})

// ---------------------------------------------------------------------------
// Reference points and zone pointers
// ---------------------------------------------------------------------------

describe('SRP0 / SRP1 / SRP2', () => {
  it('sets reference points', () => {
    const vm = run([...npushb(5), Opcode.SRP0, ...npushb(3), Opcode.SRP1, ...npushb(7), Opcode.SRP2])
    expect(vm.gs.rp0).toBe(5)
    expect(vm.gs.rp1).toBe(3)
    expect(vm.gs.rp2).toBe(7)
  })
})

describe('SZP0 / SZP1 / SZP2 / SZPS', () => {
  it('sets zone pointers', () => {
    const vm = run([...npushb(0), Opcode.SZP0, ...npushb(1), Opcode.SZP1, ...npushb(0), Opcode.SZP2])
    expect(vm.gs.zp0).toBe(0)
    expect(vm.gs.zp1).toBe(1)
    expect(vm.gs.zp2).toBe(0)
  })

  it('SZPS sets all three zone pointers', () => {
    const vm = run([...npushb(0), Opcode.SZPS])
    expect(vm.gs.zp0).toBe(0)
    expect(vm.gs.zp1).toBe(0)
    expect(vm.gs.zp2).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Rounding state
// ---------------------------------------------------------------------------

describe('RTG / RTHG / RTDG / RDTG / RUTG / ROFF', () => {
  it('RTG sets round-to-grid state', () => {
    const vm = run([Opcode.RTG])
    expect(vm.gs.roundState).toBe(1) // RoundState.GRID
  })

  it('RTHG sets round-to-half-grid state', () => {
    const vm = run([Opcode.RTHG])
    expect(vm.gs.roundState).toBe(0) // RoundState.HALF_GRID
  })

  it('ROFF disables rounding', () => {
    const vm = run([Opcode.ROFF])
    expect(vm.gs.roundState).toBe(5) // RoundState.OFF
  })
})

// ---------------------------------------------------------------------------
// Arithmetic operations
// ---------------------------------------------------------------------------

describe('ADD / SUB / MUL / DIV', () => {
  it('ADD adds two F26.6 values', () => {
    const vm = run([...npushw(f26(1.5)), ...npushw(f26(2.5)), Opcode.ADD])
    expect(stackTop26dot6(vm)).toBeCloseTo(4.0, 5)
  })

  it('SUB subtracts two F26.6 values', () => {
    const vm = run([...npushw(f26(5.0)), ...npushw(f26(2.0)), Opcode.SUB])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.0, 5)
  })

  it('MUL multiplies two F26.6 values', () => {
    const vm = run([...npushw(f26(2.0)), ...npushw(f26(3.0)), Opcode.MUL])
    expect(stackTop26dot6(vm)).toBeCloseTo(6.0, 4)
  })

  it('DIV divides two F26.6 values', () => {
    const vm = run([...npushw(f26(6.0)), ...npushw(f26(2.0)), Opcode.DIV])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.0, 4)
  })

  it('ABS returns absolute value', () => {
    const vm = run([...npushw(f26(-3.5)), Opcode.ABS])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.5, 5)
  })

  it('NEG negates value', () => {
    const vm = run([...npushw(f26(2.5)), Opcode.NEG])
    expect(stackTop26dot6(vm)).toBeCloseTo(-2.5, 5)
  })

  it('FLOOR rounds down', () => {
    const vm = run([...npushw(f26(2.9)), Opcode.FLOOR])
    expect(stackTop26dot6(vm)).toBeCloseTo(2.0, 5)
  })

  it('CEILING rounds up', () => {
    const vm = run([...npushw(f26(2.1)), Opcode.CEILING])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.0, 5)
  })

  it('MAX returns larger value', () => {
    const vm = run([...npushw(f26(3.0)), ...npushw(f26(7.0)), Opcode.MAX])
    expect(stackTop26dot6(vm)).toBeCloseTo(7.0, 5)
  })

  it('MIN returns smaller value', () => {
    const vm = run([...npushw(f26(3.0)), ...npushw(f26(7.0)), Opcode.MIN])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.0, 5)
  })
})

// ---------------------------------------------------------------------------
// Comparison and logical operations
// ---------------------------------------------------------------------------

describe('comparison ops', () => {
  it('LT: 3 < 5 → 1', () => {
    const vm = run([...npushb(3), ...npushb(5), Opcode.LT])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('LT: 5 < 3 → 0', () => {
    const vm = run([...npushb(5), ...npushb(3), Opcode.LT])
    expect(stackTop(vm, 1)).toEqual([0])
  })

  it('GT: 5 > 3 → 1', () => {
    const vm = run([...npushb(5), ...npushb(3), Opcode.GT])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('EQ: 5 == 5 → 1', () => {
    const vm = run([...npushb(5), ...npushb(5), Opcode.EQ])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('NEQ: 5 != 3 → 1', () => {
    const vm = run([...npushb(5), ...npushb(3), Opcode.NEQ])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('AND: 1 && 1 → 1', () => {
    const vm = run([...npushb(1), ...npushb(1), Opcode.AND])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('AND: 1 && 0 → 0', () => {
    const vm = run([...npushb(1), ...npushb(0), Opcode.AND])
    expect(stackTop(vm, 1)).toEqual([0])
  })

  it('OR: 1 || 0 → 1', () => {
    const vm = run([...npushb(1), ...npushb(0), Opcode.OR])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('NOT: NOT(0) → 1', () => {
    const vm = run([...npushb(0), Opcode.NOT])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('NOT: NOT(1) → 0', () => {
    const vm = run([...npushb(1), Opcode.NOT])
    expect(stackTop(vm, 1)).toEqual([0])
  })
})

describe('ODD / EVEN', () => {
  it('ODD: round(3) = 3, which is odd → 1', () => {
    const vm = run([...npushw(f26(3.0)), Opcode.ODD])
    expect(stackTop(vm, 1)).toEqual([1])
  })

  it('EVEN: round(4) = 4, which is even → 1', () => {
    const vm = run([...npushw(f26(4.0)), Opcode.EVEN])
    expect(stackTop(vm, 1)).toEqual([1])
  })
})

// ---------------------------------------------------------------------------
// Control flow
// ---------------------------------------------------------------------------

describe('IF / ELSE / EIF', () => {
  it('takes true branch', () => {
    const vm = run([
      ...npushb(1),      // condition = true
      Opcode.IF,
      ...npushb(10),     // true branch
      Opcode.ELSE,
      ...npushb(20),     // false branch
      Opcode.EIF,
    ])
    expect(stackTop(vm, 1)).toEqual([10])
  })

  it('takes false branch', () => {
    const vm = run([
      ...npushb(0),      // condition = false
      Opcode.IF,
      ...npushb(10),     // true branch
      Opcode.ELSE,
      ...npushb(20),     // false branch
      Opcode.EIF,
    ])
    expect(stackTop(vm, 1)).toEqual([20])
  })

  it('handles nested IFs correctly', () => {
    const vm = run([
      ...npushb(0),      // outer condition = false
      Opcode.IF,
      ...npushb(1),      // inner condition
      Opcode.IF,
      ...npushb(100),
      Opcode.EIF,
      Opcode.ELSE,
      ...npushb(200),    // this branch is taken
      Opcode.EIF,
    ])
    expect(stackTop(vm, 1)).toEqual([200])
  })
})

describe('JMPR', () => {
  it('jumps unconditionally by offset', () => {
    // JMPR offset is from the start of the JMPR instruction, so offset=3 skips 2 bytes
    // (PUSHB0 opcode + its data byte 99) and lands at PUSHB0 42.
    const vm = run([
      ...npushb(2),          // push value 2 (left on stack after jump)
      ...npushb(3),          // push offset = 3 (skips 2 bytes: PUSHB0 + 99)
      Opcode.JMPR,
      Opcode.PUSHB0, 99,     // skipped
      Opcode.PUSHB0, 42,     // reached
    ])
    expect(stackTop(vm, 1)).toEqual([42])
  })
})

describe('JROT / JROF', () => {
  it('JROT jumps when condition is true', () => {
    // push offset=3, condition=1, JROT
    // if true, jump 3 bytes (skipping a PUSHB0 99)
    const vm = run([
      ...npushb(3),          // offset
      ...npushb(1),          // condition = true
      Opcode.JROT,           // jumps 3-1=2 bytes forward
      Opcode.PUSHB0, 99,     // 2 bytes, skipped
      Opcode.PUSHB0, 42,     // reached
    ])
    expect(stackTop(vm, 1)).toEqual([42])
  })

  it('JROF jumps when condition is false', () => {
    const vm = run([
      ...npushb(3),          // offset
      ...npushb(0),          // condition = false
      Opcode.JROF,           // jumps
      Opcode.PUSHB0, 99,     // skipped
      Opcode.PUSHB0, 42,     // reached
    ])
    expect(stackTop(vm, 1)).toEqual([42])
  })

  it('JROT does not jump when condition is false', () => {
    const vm = run([
      ...npushb(3),
      ...npushb(0),          // condition = false
      Opcode.JROT,
      Opcode.PUSHB0, 99,     // NOT skipped
      Opcode.PUSHB0, 42,
    ])
    expect(stackTop(vm, 1)).toEqual([42])
    const second = stackTop(vm, 1)
    expect(second).toEqual([99])
  })
})

// ---------------------------------------------------------------------------
// Function definitions (FDEF / CALL / LOOPCALL)
// ---------------------------------------------------------------------------

describe('FDEF / CALL', () => {
  it('defines and calls a function', () => {
    // Define function 0: pushes 99
    // Then call function 0
    const fpgm = new Uint8Array([
      Opcode.PUSHB0, 0,   // function number 0
      Opcode.FDEF,
      Opcode.PUSHB0, 99,  // function body: push 99
      Opcode.ENDF,
    ])
    const vm = makeVM()
    vm.run(fpgm)
    vm.run(new Uint8Array([
      Opcode.PUSHB0, 0,  // function 0
      Opcode.CALL,
    ]))
    expect(stackTop(vm, 1)).toEqual([99])
  })
})

describe('LOOPCALL', () => {
  it('calls function N times', () => {
    const fpgm = new Uint8Array([
      Opcode.PUSHB0, 0,
      Opcode.FDEF,
      Opcode.PUSHB0, 1,  // push 1
      Opcode.ENDF,
    ])
    const vm = makeVM()
    vm.run(fpgm)
    // LOOPCALL pops: f (top = function index), count (below)
    // Push count first (deeper), then f on top
    vm.run(new Uint8Array([
      Opcode.PUSHB0, 3,  // count (pushed first = deeper)
      Opcode.PUSHB0, 0,  // function index f (pushed second = top)
      Opcode.LOOPCALL,
    ]))
    expect(vm.stack.depth()).toBe(3)
    expect(stackTop(vm, 3)).toEqual([1, 1, 1])
  })
})

// ---------------------------------------------------------------------------
// Rounding with RTG
// ---------------------------------------------------------------------------

describe('ROUND', () => {
  it('rounds to grid (RTG) via ROUND0', () => {
    const vm = run([
      Opcode.RTG,
      ...npushw(f26(2.7)),
      Opcode.ROUND0,
    ])
    expect(stackTop26dot6(vm)).toBeCloseTo(3.0, 5)
  })

  it('rounds to half-grid (RTHG) via ROUND0', () => {
    const vm = run([
      Opcode.RTHG,
      ...npushw(f26(2.7)),
      Opcode.ROUND0,
    ])
    expect(stackTop26dot6(vm)).toBeCloseTo(2.5, 5)
  })

  it('ROFF: no rounding (value passes through as-is)', () => {
    // 2.7 * 64 = 172.8, rounded to 173 in 26.6 → 173/64 ≈ 2.703125
    const vm = run([
      Opcode.ROFF,
      ...npushw(f26(2.7)),
      Opcode.ROUND0,
    ])
    // ROFF returns value unchanged; compare in 26.6 raw integers
    expect(stackTop(vm, 1)).toEqual([f26(2.7)])
  })
})

describe('NROUND', () => {
  it('passes value through unchanged', () => {
    const vm = run([...npushw(f26(2.7)), Opcode.NROUND0])
    expect(stackTop(vm, 1)).toEqual([f26(2.7)])
  })
})

// ---------------------------------------------------------------------------
// SRP0, SLOOP
// ---------------------------------------------------------------------------

describe('SLOOP', () => {
  it('sets loop counter', () => {
    const vm = run([...npushb(5), Opcode.SLOOP])
    expect(vm.gs.loop).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Graphics state flags
// ---------------------------------------------------------------------------

describe('FLIPON / FLIPOFF', () => {
  it('FLIPON sets autoFlip to true', () => {
    const vm = run([Opcode.FLIPOFF, Opcode.FLIPON])
    expect(vm.gs.autoFlip).toBe(true)
  })

  it('FLIPOFF sets autoFlip to false', () => {
    const vm = run([Opcode.FLIPOFF])
    expect(vm.gs.autoFlip).toBe(false)
  })
})

describe('SMD', () => {
  it('sets minimum distance', () => {
    const vm = run([...npushw(f26(1.5)), Opcode.SMD])
    expect(vm.gs.minimumDistance).toBeCloseTo(1.5, 5)
  })
})

describe('SCVTCI', () => {
  it('sets CVT cut-in', () => {
    const vm = run([...npushw(f26(0.5)), Opcode.SCVTCI])
    expect(vm.gs.controlValueCutIn).toBeCloseTo(0.5, 5)
  })
})

describe('SDB / SDS', () => {
  it('sets delta base and shift', () => {
    const vm = run([...npushb(12), Opcode.SDB, ...npushb(4), Opcode.SDS])
    expect(vm.gs.deltaBase).toBe(12)
    expect(vm.gs.deltaShift).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// GC - Get Coordinate
// ---------------------------------------------------------------------------

describe('GC', () => {
  it('GC0 projects current point onto projection vector (X axis)', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([{ x: 100, y: 200, onCurve: true }]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,    // projection = x axis
      ...npushb(0),     // point 0
      Opcode.GC0,
    ]))
    // Projection of (100, 200) onto x-axis = 100
    expect(stackTop26dot6(vm)).toBeCloseTo(100, 3)
  })

  it('GC0 projects current point onto projection vector (Y axis)', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([{ x: 100, y: 200, onCurve: true }]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA0,    // projection = y axis
      ...npushb(0),
      Opcode.GC0,
    ]))
    expect(stackTop26dot6(vm)).toBeCloseTo(200, 3)
  })
})

// ---------------------------------------------------------------------------
// SCFS - Set Coordinate From Stack
// ---------------------------------------------------------------------------

describe('SCFS', () => {
  it('moves a point to the specified coordinate along the projection vector', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph({
      type: 'simple',
      xMin: 0, yMin: 0, xMax: 100, yMax: 200,
      endPtsOfContours: [0],
      instructions: new Uint8Array(),
      points: [{ x: 100, y: 200, onCurve: true }],
      contoursOverlap: false,
    } as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,        // both vectors = x axis
      // SCFS pops: value (top), p (below) → push p first, then value
      ...npushb(0),         // point p=0 (pushed first = deeper)
      ...npushw(f26(150)),  // target coordinate = 150 (pushed second = top)
      Opcode.SCFS,
    ]))

    const pt = vm.getGlyph().points[0]
    expect(pt.x).toBeCloseTo(150, 3)
    expect(pt.y).toBeCloseTo(200, 3) // y unchanged
  })
})

// ---------------------------------------------------------------------------
// MD - Measure Distance
// ---------------------------------------------------------------------------

describe('MD', () => {
  it('MD0 measures distance between two hinted points along projection vector', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([
      { x: 100, y: 0, onCurve: true },
      { x: 400, y: 0, onCurve: true },
    ]) as any)

    // MD pops: p2 (top, zp1), p1 (below, zp0)
    // Distance = dot(zones[zp0][p1] - zones[zp1][p2], projVec)
    // For +300: p1 → zp0 → point 1 (x=400), p2 → zp1 → point 0 (x=100)
    // Push p1=1 first (deeper), p2=0 second (top)
    vm.run(new Uint8Array([
      Opcode.SVTCA1,    // projection = x axis
      ...npushb(1),     // p2 = point 1 is wrong naming; p1 goes deeper
      ...npushb(0),     // p2 = point 0 on top (zp1)
      Opcode.MD0,
    ]))
    // p2=0 (top, zp1, x=100), p1=1 (below, zp0, x=400): distance = 400-100 = 300
    expect(stackTop26dot6(vm)).toBeCloseTo(300, 3)
  })
})

// ---------------------------------------------------------------------------
// MDAP - Move Direct Absolute Point
// ---------------------------------------------------------------------------

describe('MDAP', () => {
  it('MDAP0 (no round) touches the point without moving it', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([{ x: 100, y: 0, onCurve: true }]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,
      ...npushb(0),  // point 0
      Opcode.MDAP0,
    ]))

    expect(vm.getGlyph().points[0].x).toBeCloseTo(100, 3)
    expect(vm.gs.rp0).toBe(0)
    expect(vm.gs.rp1).toBe(0)
  })

  it('MDAP1 (round) snaps point to grid', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([{ x: 100.7, y: 0, onCurve: true }]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1, // projection = x-axis
      Opcode.RTG,
      ...npushb(0),  // point 0
      Opcode.MDAP1,
    ]))

    // 100.7 should round to 101
    expect(vm.getGlyph().points[0].x).toBeCloseTo(101, 0)
  })
})

// ---------------------------------------------------------------------------
// ALIGNRP - Align Reference Point
// ---------------------------------------------------------------------------

describe('ALIGNRP', () => {
  it('aligns a point with rp0 along the projection vector', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([
      { x: 100, y: 50, onCurve: true },
      { x: 200, y: 80, onCurve: true },
    ]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,    // both vectors = x axis
      ...npushb(0),     // rp0 = point 0
      Opcode.SRP0,
      ...npushb(1),     // point to align = 1
      Opcode.ALIGNRP,
    ]))

    // Point 1's x should equal point 0's x = 100
    const pts = vm.getGlyph().points
    expect(pts[1].x).toBeCloseTo(100, 3)
    expect(pts[1].y).toBeCloseTo(80, 3) // y unchanged (freedom = x-axis)
  })
})

// ---------------------------------------------------------------------------
// ALIGNPTS - Align Two Points
// ---------------------------------------------------------------------------

describe('ALIGNPTS', () => {
  it('aligns two points by halving the distance', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([
      { x: 100, y: 0, onCurve: true },
      { x: 200, y: 0, onCurve: true },
    ]) as any)

    // ALIGNPTS pops: p1 (top, zp1), p2 (below, zp0)
    // Push p2 first (deeper), then p1 (top)
    vm.run(new Uint8Array([
      Opcode.SVTCA1,  // both vectors = x axis
      ...npushb(1),   // p2=1 from zp0 (pushed first = deeper)
      ...npushb(0),   // p1=0 from zp1 (pushed second = top)
      Opcode.ALIGNPTS,
    ]))

    // Both points should meet in the middle around 150
    const pts = vm.getGlyph().points
    expect(pts[0].x).toBeCloseTo(150, 0)
    expect(pts[1].x).toBeCloseTo(150, 0)
  })
})

// ---------------------------------------------------------------------------
// FLIPPT / FLIPRGON / FLIPRGOFF
// ---------------------------------------------------------------------------

describe('FLIPPT', () => {
  it('flips on-curve flag of a point', () => {
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([{ x: 0, y: 0, onCurve: true }]) as any)

    vm.run(new Uint8Array([...npushb(0), Opcode.FLIPPT]))
    expect(vm.getGlyph().points[0].onCurve).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ISECT - Line Intersection
// ---------------------------------------------------------------------------

describe('ISECT', () => {
  it('finds intersection of two perpendicular lines', () => {
    // Line A: horizontal y=50, points 0=(0,50) and 1=(100,50) in zp1
    // Line B: vertical x=60, points 2=(60,0) and 3=(60,100) in zp0
    // Intersection: (60, 50), moved to point 4
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([
      { x: 0, y: 50, onCurve: true },    // 0: a0 (in zp1)
      { x: 100, y: 50, onCurve: true },  // 1: a1 (in zp1)
      { x: 60, y: 0, onCurve: true },    // 2: b0 (in zp0)
      { x: 60, y: 100, onCurve: true },  // 3: b1 (in zp0)
      { x: 0, y: 0, onCurve: true },     // 4: p
    ]) as any)

    // ISECT pops: b1, b0, a1, a0, p (top to bottom)
    // So push in REVERSE order: p first (deepest), then a0, a1, b0, b1 (top)
    vm.run(new Uint8Array([
      ...npushb(4, 0, 1, 2, 3),  // p=4(deep), a0=0, a1=1, b0=2, b1=3(top)
      Opcode.ISECT,
    ]))

    const pts = vm.getGlyph().points
    expect(pts[4].x).toBeCloseTo(60, 1)
    expect(pts[4].y).toBeCloseTo(50, 1)
  })
})

// ---------------------------------------------------------------------------
// IP - Interpolate Points
// ---------------------------------------------------------------------------

describe('IP', () => {
  it('interpolates a point proportionally between two reference points', () => {
    const vm = makeVM({ maxStackElements: 128 })
    // rp1 at 0 (x=0), rp2 at 2 (x=100)
    // point 1 at original x=50, rp1 moves to x=10, rp2 moves to x=110
    // So point 1 should interpolate to x = 10 + (50/100)*(110-10) = 60
    vm.setGlyph(makeGlyph([
      { x: 0, y: 0, onCurve: true },    // 0: rp1
      { x: 50, y: 0, onCurve: true },   // 1: interpolated point
      { x: 100, y: 0, onCurve: true },  // 2: rp2
    ]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,  // x-axis

      ...npushb(0), Opcode.SRP1,
      ...npushb(2), Opcode.SRP2,

      // SCFS: push p first (deeper), value (top)
      ...npushb(0), ...npushw(f26(10)),  // p=0, value=10
      Opcode.SCFS,
      ...npushb(2), ...npushw(f26(110)), // p=2, value=110
      Opcode.SCFS,

      ...npushb(1), Opcode.IP,
    ]))

    const pts = vm.getGlyph().points
    expect(pts[1].x).toBeCloseTo(60, 0)
  })
})

// ---------------------------------------------------------------------------
// IUP - Interpolate Untouched Points
// ---------------------------------------------------------------------------

describe('IUP', () => {
  it('IUP1 (x-axis) interpolates untouched points', () => {
    const vm = makeVM({ maxStackElements: 128 })
    // Contour: 3 points. Touch 0 and 2, interpolate 1.
    // Original: (0,0), (50,0), (100,0). Move 0→x=10, 2→x=90.
    // Point 1 should interpolate to x = 10 + (50/100)*(90-10) = 50
    vm.setGlyph(makeGlyph([
      { x: 0, y: 0, onCurve: true },
      { x: 50, y: 0, onCurve: true },
      { x: 100, y: 0, onCurve: true },
    ]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,  // both vectors = x-axis

      // SCFS: p first (deeper), value (top)
      ...npushb(0), ...npushw(f26(10)),  // p=0, value=10
      Opcode.SCFS,
      ...npushb(2), ...npushw(f26(90)),  // p=2, value=90
      Opcode.SCFS,

      Opcode.IUP1,
    ]))

    const pts = vm.getGlyph().points
    expect(pts[0].x).toBeCloseTo(10, 1)
    expect(pts[1].x).toBeCloseTo(50, 0) // interpolated
    expect(pts[2].x).toBeCloseTo(90, 1)
  })
})

// ---------------------------------------------------------------------------
// MDRP - Move Direct Reference Point
// ---------------------------------------------------------------------------

describe('MDRP', () => {
  it('MDRP10 moves point maintaining original distance from rp0', () => {
    // MDRP10 = 0xd0: bit4=1 (set rp0), bit3=0 (no min dist), bit2=0 (no round), de=0
    const vm = makeVM({ maxStackElements: 128 })
    vm.setGlyph(makeGlyph([
      { x: 0, y: 0, onCurve: true },
      { x: 100, y: 0, onCurve: true },
    ]) as any)

    vm.run(new Uint8Array([
      Opcode.SVTCA1,              // both vectors = x-axis
      ...npushb(0), Opcode.SRP0, // rp0 = point 0

      // SCFS: p first (deeper), value (top)
      ...npushb(0), ...npushw(f26(10)), // move point 0 to x=10
      Opcode.SCFS,

      // MDRP10 on point 1: should maintain original distance of 100 from rp0
      ...npushb(1), Opcode.MDRP10,
    ]))

    const pts = vm.getGlyph().points
    // rp0 now at x=10; original dist was 100; point 1 should be at x=10+100=110
    expect(pts[1].x).toBeCloseTo(110, 0)
  })
})

// ---------------------------------------------------------------------------
// GETINFO
// ---------------------------------------------------------------------------

describe('GETINFO', () => {
  it('returns version info when bit 0 is set', () => {
    const vm = run([...npushb(1), Opcode.GETINFO])
    const result = stackTop(vm, 1)[0]
    // Apple returns version 7; our code returns 42; both are non-zero
    expect(result).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// SANGW / AA (deprecated, no-op)
// ---------------------------------------------------------------------------

describe('deprecated opcodes', () => {
  it('SANGW pops from stack without error', () => {
    const vm = run([...npushb(1), Opcode.SANGW])
    expect(vm.stack.depth()).toBe(0)
  })

  it('AA pops from stack without error', () => {
    const vm = run([...npushb(1), Opcode.AA])
    expect(vm.stack.depth()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// GETDATA
// ---------------------------------------------------------------------------

describe('GETDATA', () => {
  it('type 1: returns fair dice roll mod n', () => {
    // Push n=17, type=1 → 17 % 17 = 0, success = 1
    const vm = run([...npushb(17), ...npushb(1), Opcode.GETDATA])
    const success = stackTop(vm, 1)[0]
    expect(success).toBe(1)
    // result already popped as success; the value (17%17=0) was on stack before success
    // Actually looking at the implementation: push result, push success
    // So top is success, below is result
  })
})
