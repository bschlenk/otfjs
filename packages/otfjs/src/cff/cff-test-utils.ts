// Encoders for building CFF data in tests. Not exported from the package.

import { Writer } from '@otfjs/buffer'

// prettier-ignore
const OPERATORS: Record<string, number | [12, number]> = {
  hstem: 1, vstem: 3, vmoveto: 4, rlineto: 5, hlineto: 6, vlineto: 7,
  rrcurveto: 8, callsubr: 10, return: 11, endchar: 14, hstemhm: 18,
  hintmask: 19, cntrmask: 20, rmoveto: 21, hmoveto: 22, vstemhm: 23,
  rcurveline: 24, rlinecurve: 25, vvcurveto: 26, hhcurveto: 27,
  callgsubr: 29, vhcurveto: 30, hvcurveto: 31,
  and: [12, 3], or: [12, 4], not: [12, 5], abs: [12, 9], add: [12, 10],
  sub: [12, 11], div: [12, 12], neg: [12, 14], eq: [12, 15], drop: [12, 18],
  put: [12, 20], get: [12, 21], ifelse: [12, 22], mul: [12, 24],
  sqrt: [12, 26], dup: [12, 27], exch: [12, 28], index: [12, 29],
  roll: [12, 30], hflex: [12, 34], flex: [12, 35], hflex1: [12, 36],
  flex1: [12, 37],
}

/**
 * Encode a charstring. Numbers are operands, strings are operators, and
 * arrays are raw bytes, like a hintmask's mask.
 */
export function charString(...items: (number | string | number[])[]) {
  const bytes: number[] = []

  for (const item of items) {
    if (Array.isArray(item)) {
      bytes.push(...item)
    } else if (typeof item === 'string') {
      const op = OPERATORS[item]
      if (op === undefined) throw new Error(`Unknown operator ${item}`)
      bytes.push(...(Array.isArray(op) ? op : [op]))
    } else {
      bytes.push(...encodeOperand(item))
    }
  }

  return new Uint8Array(bytes)
}

/** Encode a CFF INDEX, with 4-byte offsets. */
export function cffIndex(items: Uint8Array[]): Uint8Array {
  const w = new Writer()
  w.u16(items.length)
  if (items.length === 0) return w.toBuffer()

  w.u8(4)
  let offset = 1
  w.u32(offset)
  for (const item of items) w.u32((offset += item.length))
  for (const item of items) w.buffer(item)

  return w.toBuffer()
}

/**
 * Encode a DICT. Keys are operators, as a number or `12 n` for two-byte
 * ones, and operands are integers, each written as 5 bytes so the size
 * doesn't depend on the values.
 */
export function cffDict(entries: [number | string, number[]][]): Uint8Array {
  const w = new Writer()

  for (const [op, operands] of entries) {
    for (const v of operands) {
      w.u8(29)
      w.i32(v)
    }
    if (typeof op === 'number') {
      w.u8(op)
    } else {
      w.u8(12)
      w.u8(+op.split(' ')[1])
    }
  }

  return w.toBuffer()
}

interface CffFontProps {
  charStrings: Uint8Array[]
  globalSubrs?: Uint8Array[]
}

interface CffPrivateProps {
  subrs?: Uint8Array[]
  defaultWidthX?: number
  nominalWidthX?: number
}

/**
 * Encode a CFF table holding one font. With `fds`, the font is CID-keyed:
 * each glyph uses the Private DICT of the Font DICT that `fdSelect` gives
 * it, written in FDSelect format 3.
 */
export function cffTable(
  props: CffFontProps &
    (
      | { private: CffPrivateProps }
      | { fds: CffPrivateProps[]; fdSelect: number[] }
    ),
): Uint8Array {
  const header = new Uint8Array([1, 0, 4, 4])
  const names = cffIndex([new TextEncoder().encode('Test')])
  const strings = cffIndex([])
  const globalSubrs = cffIndex(props.globalSubrs ?? [])
  const charStrings = cffIndex(props.charStrings)
  const privates = 'fds' in props ? props.fds : [props.private]

  // The Top DICT's size doesn't depend on its offsets, so lay everything
  // out with a placeholder first.
  const topDictFor = (offsets: number[]) =>
    cffIndex([
      cffDict(
        'fds' in props ?
          [
            ['12 30', [391, 392, 0]],
            [17, [offsets[0]]],
            ['12 36', [offsets[1]]],
            ['12 37', [offsets[2]]],
          ]
        : [
            [17, [offsets[0]]],
            [18, [offsets[1], offsets[2]]],
          ],
      ),
    ])

  const start =
    header.length +
    names.length +
    topDictFor([0, 0, 0]).length +
    strings.length +
    globalSubrs.length

  const parts: Uint8Array[] = []
  let offset = start
  const add = (bytes: Uint8Array) => {
    const at = offset
    parts.push(bytes)
    offset += bytes.length
    return at
  }

  const charStringsOffset = add(charStrings)

  // Each Private DICT is followed by its subrs, which it finds by offset
  // from its own start
  const privateLocations = privates.map((p) => {
    const entries = (subrsOffset: number): [number, number[]][] => [
      [20, [p.defaultWidthX ?? 0]],
      [21, [p.nominalWidthX ?? 0]],
      ...(p.subrs ? [[19, [subrsOffset]] as [number, number[]]] : []),
    ]
    const size = cffDict(entries(0)).length
    const dict = cffDict(entries(size))
    const at = add(dict)
    if (p.subrs) add(cffIndex(p.subrs))
    return [size, at]
  })

  let topOffsets: number[]
  if ('fds' in props) {
    const fdArray = cffIndex(
      privateLocations.map((location) => cffDict([[18, location]])),
    )
    const fdArrayOffset = add(fdArray)
    const fdSelectOffset = add(fdSelectFormat3(props.fdSelect))
    topOffsets = [charStringsOffset, fdArrayOffset, fdSelectOffset]
  } else {
    topOffsets = [charStringsOffset, ...privateLocations[0]]
  }

  return concat([
    header,
    names,
    topDictFor(topOffsets),
    strings,
    globalSubrs,
    ...parts,
  ])
}

function fdSelectFormat3(fds: number[]) {
  const ranges: [number, number][] = []
  fds.forEach((fd, gid) => {
    if (ranges.at(-1)?.[1] !== fd) ranges.push([gid, fd])
  })

  const w = new Writer()
  w.u8(3)
  w.u16(ranges.length)
  for (const [first, fd] of ranges) {
    w.u16(first)
    w.u8(fd)
  }
  w.u16(fds.length)
  return w.toBuffer()
}

function encodeOperand(v: number): number[] {
  if (!Number.isInteger(v)) {
    const fixed = Math.round(v * 65536)
    return [
      255,
      (fixed >> 24) & 0xff,
      (fixed >> 16) & 0xff,
      (fixed >> 8) & 0xff,
      fixed & 0xff,
    ]
  }
  if (v >= -107 && v <= 107) return [v + 139]
  if (v >= 108 && v <= 1131) {
    const u = v - 108
    return [(u >> 8) + 247, u & 0xff]
  }
  if (v >= -1131 && v <= -108) {
    const u = -v - 108
    return [(u >> 8) + 251, u & 0xff]
  }
  return [28, (v >> 8) & 0xff, v & 0xff]
}

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}
