import { Reader } from '@otfjs/buffer'
import { describe, expect, it } from 'vitest'

import { PathRecorder } from '../path-recorder.js'
import {
  type CharStringContext,
  runCharString,
  subrBias,
} from './cff.charstring.js'
import { readCffIndex } from './cff.index.js'
import { cffIndex, charString } from './cff-test-utils.js'

describe('runCharString', () => {
  it('draws lines and closes the contour at endchar', () => {
    const { commands } = run(
      charString(10, 20, 'rmoveto', 30, 0, 0, 40, 'rlineto', 'endchar'),
    )
    expect(commands).toEqual([
      { type: 'moveTo', x: 10, y: 20 },
      { type: 'lineTo', x: 40, y: 20 },
      { type: 'lineTo', x: 40, y: 60 },
      { type: 'closePath' },
    ])
  })

  it('closes each contour when the next one starts', () => {
    const { commands } = run(
      charString(
        0,
        0,
        'rmoveto',
        10,
        'hlineto',
        50,
        'hmoveto',
        10,
        'vlineto',
        'endchar',
      ),
    )
    expect(commands.map((c) => c.type)).toEqual([
      'moveTo',
      'lineTo',
      'closePath',
      'moveTo',
      'lineTo',
      'closePath',
    ])
    expect(commands[3]).toEqual({ type: 'moveTo', x: 60, y: 0 })
  })

  it.each([
    ['rmoveto', charString(500, 1, 2, 'rmoveto', 'endchar')],
    ['hmoveto', charString(500, 1, 'hmoveto', 'endchar')],
    ['vmoveto', charString(500, 1, 'vmoveto', 'endchar')],
    ['hstem', charString(500, 0, 10, 'hstem', 'endchar')],
    ['hintmask', charString(500, 0, 10, 'hintmask', [0x80], 'endchar')],
    ['endchar', charString(500, 'endchar')],
  ])('reads a width before %s', (_, code) => {
    expect(run(code).width).toBe(500 + NOMINAL)
  })

  it('uses the default width when there is none', () => {
    expect(run(charString(1, 2, 'rmoveto', 'endchar')).width).toBe(DEFAULT)
    expect(run(charString('endchar')).width).toBe(DEFAULT)
  })

  it('alternates horizontal and vertical lines', () => {
    expect(
      points(run(charString(0, 'hmoveto', 10, 20, 30, 'hlineto'))),
    ).toEqual([
      [0, 0],
      [10, 0],
      [10, 20],
      [40, 20],
    ])
    expect(points(run(charString(0, 'hmoveto', 10, 20, 'vlineto')))).toEqual([
      [0, 0],
      [0, 10],
      [20, 10],
    ])
  })

  it('draws rrcurveto curves', () => {
    const { commands } = run(
      charString(0, 'hmoveto', 1, 2, 3, 4, 5, 6, 'rrcurveto'),
    )
    expect(commands[1]).toEqual(curve(1, 2, 4, 6, 9, 12))
  })

  it('draws hhcurveto and vvcurveto, with an optional first offset', () => {
    expect(
      run(charString(0, 'hmoveto', 7, 1, 2, 3, 4, 'hhcurveto')).commands[1],
    ).toEqual(curve(1, 7, 3, 10, 7, 10))
    expect(
      run(charString(0, 'hmoveto', 7, 1, 2, 3, 4, 'vvcurveto')).commands[1],
    ).toEqual(curve(7, 1, 9, 4, 9, 8))
  })

  it('alternates the start tangent of hvcurveto and vhcurveto', () => {
    // horizontal start, then vertical start, with a last extra operand
    const { commands } = run(
      charString(0, 'hmoveto', 10, 5, 5, 10, 10, 5, 5, 10, 3, 'hvcurveto'),
    )
    expect(commands.slice(1, -1)).toEqual([
      curve(10, 0, 15, 5, 15, 15),
      curve(15, 25, 20, 30, 30, 33),
    ])

    const vh = run(charString(0, 'hmoveto', 10, 5, 5, 10, 'vhcurveto'))
    expect(vh.commands[1]).toEqual(curve(0, 10, 5, 15, 15, 15))
  })

  it('draws rcurveline and rlinecurve', () => {
    const cl = run(
      charString(0, 'hmoveto', 1, 1, 1, 1, 1, 1, 5, 0, 'rcurveline'),
    )
    expect(cl.commands.slice(1, -1)).toEqual([
      curve(1, 1, 2, 2, 3, 3),
      { type: 'lineTo', x: 8, y: 3 },
    ])

    const lc = run(
      charString(0, 'hmoveto', 5, 0, 1, 1, 1, 1, 1, 1, 'rlinecurve'),
    )
    expect(lc.commands.slice(1, -1)).toEqual([
      { type: 'lineTo', x: 5, y: 0 },
      curve(6, 1, 7, 2, 8, 3),
    ])
  })

  it('draws flex as two curves', () => {
    const { commands } = run(
      charString(
        0,
        'hmoveto',
        1,
        1,
        1,
        1,
        1,
        1,
        1,
        -1,
        1,
        -1,
        1,
        -1,
        50,
        'flex',
      ),
    )
    expect(commands.slice(1, -1)).toEqual([
      curve(1, 1, 2, 2, 3, 3),
      curve(4, 2, 5, 1, 6, 0),
    ])
  })

  it('draws hflex, keeping both curves level at the ends', () => {
    const { commands } = run(
      charString(0, 'hmoveto', 1, 2, 3, 4, 5, 6, 7, 'hflex'),
    )
    expect(commands.slice(1, -1)).toEqual([
      curve(1, 0, 3, 3, 7, 3),
      curve(12, 3, 18, 0, 25, 0),
    ])
  })

  it('draws hflex1, ending at the starting height', () => {
    const { commands } = run(
      charString(0, 'hmoveto', 1, 1, 1, 1, 1, 1, 1, -1, 1, 'hflex1'),
    )
    expect(commands[2]).toEqual(curve(4, 2, 5, 1, 6, 0))
  })

  it('draws flex1, ending along the axis the curves moved furthest', () => {
    // dx totals 5 and dy totals 1, so the last point moves 7 in x and
    // returns to y = 0
    const { commands } = run(
      charString(0, 'hmoveto', 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 7, 'flex1'),
    )
    expect(commands[2]).toEqual(curve(4, 1, 5, 1, 12, 0))
  })

  it('skips hint mask bytes, which would otherwise read as operators', () => {
    // 9 stems need two mask bytes; 0x15 is rmoveto
    const stems = Array.from({ length: 18 }, (_, i) => i)
    const { commands } = run(
      charString(
        ...stems,
        'hstemhm',
        'hintmask',
        [0x15, 0x15],
        3,
        4,
        'rmoveto',
        'endchar',
      ),
    )
    expect(commands[0]).toEqual({ type: 'moveTo', x: 3, y: 4 })
  })

  it('counts operands before hintmask as vstems', () => {
    // 1 hstem + 8 implied vstems = 9 stems, so two mask bytes
    const { commands } = run(
      charString(
        0,
        1,
        'hstem',
        ...Array.from({ length: 16 }, () => 1),
        'hintmask',
        [0, 0x15],
        3,
        4,
        'rmoveto',
      ),
    )
    expect(commands[0]).toEqual({ type: 'moveTo', x: 3, y: 4 })
  })

  it('calls local and global subroutines, numbered from the bias', () => {
    const local = [charString(10, 0, 'rlineto', 'return')]
    const global = [charString(0, 10, 'rlineto', 'return')]
    const { commands } = run(
      charString(0, 'hmoveto', -107, 'callsubr', -107, 'callgsubr', 'endchar'),
      { localSubrs: index(local), globalSubrs: index(global) },
    )
    expect(points({ commands })).toEqual([
      [0, 0],
      [10, 0],
      [10, 10],
    ])
  })

  it('ends the glyph from an endchar inside a subroutine', () => {
    const local = [charString(10, 0, 'rlineto', 'endchar')]
    const { commands } = run(
      charString(0, 'hmoveto', -107, 'callsubr', 0, 10, 'rlineto'),
      { localSubrs: index(local) },
    )
    expect(commands.map((c) => c.type)).toEqual([
      'moveTo',
      'lineTo',
      'closePath',
    ])
  })

  it('reads every operand encoding', () => {
    // one byte, two bytes positive and negative, 28's i16, 255's 16.16
    const { commands } = run(
      charString(100, -1000, 'rmoveto', 5000, 1.5, 'rlineto'),
    )
    expect(commands.slice(0, 2)).toEqual([
      { type: 'moveTo', x: 100, y: -1000 },
      { type: 'lineTo', x: 5100, y: -998.5 },
    ])
  })

  it('leaves arithmetic results on the stack', () => {
    const { commands } = run(
      charString(
        2,
        3,
        'add',
        10,
        4,
        'sub',
        'rmoveto',
        6,
        'dup',
        'mul',
        9,
        'sqrt',
        'exch',
        'rlineto',
      ),
    )
    expect(points({ commands })).toEqual([
      [5, 6],
      [8, 42],
    ])
  })

  it('stores values with put and get', () => {
    const { commands } = run(charString(7, 0, 'put', 0, 'get', 0, 'rmoveto'))
    expect(commands[0]).toEqual({ type: 'moveTo', x: 7, y: 0 })
  })

  it('throws when an operator needs more operands than the stack has', () => {
    expect(() =>
      run(charString('callsubr'), { localSubrs: index([]) }),
    ).toThrow('stack underflow')
  })
})

describe('subrBias', () => {
  it('depends on how many subroutines there are', () => {
    expect(subrBias(0)).toBe(107)
    expect(subrBias(1239)).toBe(107)
    expect(subrBias(1240)).toBe(1131)
    expect(subrBias(33899)).toBe(1131)
    expect(subrBias(33900)).toBe(32768)
  })
})

const DEFAULT = 600
const NOMINAL = 100

function run(code: Uint8Array, ctx: Partial<CharStringContext> = {}) {
  const recorder = new PathRecorder()
  const width = runCharString(
    code,
    {
      globalSubrs: index([]),
      localSubrs: null,
      defaultWidthX: DEFAULT,
      nominalWidthX: NOMINAL,
      ...ctx,
    },
    recorder,
  )
  return { commands: recorder.commands, width }
}

function index(items: Uint8Array[]) {
  return readCffIndex(new Reader(cffIndex(items)))
}

function curve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x: number,
  y: number,
) {
  return { type: 'cubicCurveTo', x1, y1, x2, y2, x, y }
}

/** The on-curve points of a path made of moves and lines. */
function points({ commands }: { commands: PathRecorder['commands'] }) {
  return commands.flatMap((c) => ('x' in c ? [[c.x, c.y]] : []))
}
