import { Reader } from '../buffer/reader.js'
import { highNibble, lowNibble } from '../utils/bit.js'
import { assert, error } from '../utils/utils.js'

export type CffTable = ReturnType<typeof readCffTable>

const INVALID_DICT_VALUES = new Set([22, 23, 24, 25, 26, 27, 31, 255])

export function readCffTable(view: Reader) {
  const tableStart = view.offset
  const major = view.u8()
  const minor = view.u8()
  const hdrSize = view.u8()
  const offSize = view.u8()

  view.skip(hdrSize - 4)

  const names = readIndex(view, (data) => DECODER.decode(data.data))

  const topDicts = readIndex(view, (data) => readDict(data))

  const strings = readIndex(view, (data) => DECODER.decode(data.data))

  const globalSubrIndex = readIndex(view, (data) => data.data)

  // Read additional structures based on Top DICT
  const topDict = topDicts?.[0]
  let charStrings: Uint8Array[] | null = null
  let privateDict: Record<string, number[]> | null = null
  let localSubrIndex: Uint8Array[] | null = null
  let charset: number[] | null = null

  if (topDict) {
    // Read CharStrings INDEX
    if (topDict.CharStrings) {
      const charStringsOffset = topDict.CharStrings[0]
      const charStringsView = view.subtable(tableStart + charStringsOffset)
      charStrings = readIndex(charStringsView, (data) => data.data)
    }

    // Read Private DICT
    if (topDict.Private) {
      const [privateSize, privateOffset] = topDict.Private
      const privateDictView = view.subtable(tableStart + privateOffset, privateSize)
      privateDict = readDict(privateDictView)

      // Read Local Subr INDEX if present
      if (privateDict.Subrs) {
        const localSubrOffset = privateDict.Subrs[0]
        const localSubrView = view.subtable(
          tableStart + privateOffset + localSubrOffset,
        )
        localSubrIndex = readIndex(localSubrView, (data) => data.data)
      }
    }

    // Read charset
    if (topDict.charset && charStrings) {
      const charsetOffset = topDict.charset[0]
      if (charsetOffset !== 0 && charsetOffset !== 1 && charsetOffset !== 2) {
        // Custom charset (0, 1, 2 are predefined)
        const charsetView = view.subtable(tableStart + charsetOffset)
        charset = readCharset(charsetView, charStrings.length)
      }
    }
  }

  return {
    major,
    minor,
    hdrSize,
    offSize,
    names,
    topDicts,
    strings,
    globalSubrIndex,
    charStrings,
    privateDict,
    localSubrIndex,
    charset,
  }
}

function readDict(data: Reader): Record<string, number[]> {
  const entries: [string, number[]][] = []
  let values: number[] = []

  while (!data.done()) {
    const b0 = data.u8()
    let r = 0

    assert(!INVALID_DICT_VALUES.has(b0), 'Reserved dict value')

    if (b0 <= 21) {
      // operator
      const op = readOperator(data, b0)
      entries.push([op, values])
      values = []
      continue
    } else if (b0 === 28) {
      r = data.i16()
    } else if (b0 === 29) {
      r = data.i32()
    } else if (b0 === 30) {
      // real number
      r = readRealNumber(data)
    } else if (b0 <= 246) {
      r = b0 - 139
    } else if (b0 <= 250) {
      const b1 = data.u8()
      r = (b0 - 247) * 256 + b1 + 108
    } else if (b0 <= 254) {
      const b1 = data.u8()
      r = -(b0 - 251) * 256 - b1 - 108
    }

    values.push(r)
  }

  return Object.fromEntries(entries)
}

function readCharset(view: Reader, numGlyphs: number): number[] {
  const format = view.u8()
  const charset: number[] = [0] // .notdef is always 0

  if (format === 0) {
    // Format 0: Array of SIDs
    for (let i = 1; i < numGlyphs; i++) {
      charset.push(view.u16())
    }
  } else if (format === 1) {
    // Format 1: Ranges with 1-byte counts
    let i = 1
    while (i < numGlyphs) {
      const first = view.u16()
      const nLeft = view.u8()
      for (let j = 0; j <= nLeft && i < numGlyphs; j++, i++) {
        charset.push(first + j)
      }
    }
  } else if (format === 2) {
    // Format 2: Ranges with 2-byte counts
    let i = 1
    while (i < numGlyphs) {
      const first = view.u16()
      const nLeft = view.u16()
      for (let j = 0; j <= nLeft && i < numGlyphs; j++, i++) {
        charset.push(first + j)
      }
    }
  }

  return charset
}

function readIndex<T>(view: Reader, fn: (data: Reader) => T): T[] | null {
  const count = view.u16()
  if (count === 0) return null

  const items: T[] = []

  const offSize = view.u8() as ByteSize
  const offsets = view.array(count + 1, () => readBytes(view, offSize))

  const dStart = view.offset - 1

  for (let i = 0; i < count; ++i) {
    const start = offsets[i]
    const size = offsets[i + 1] - start
    const data = view.subtable(dStart + start, size)
    items.push(fn(data))
  }

  view.skip(offsets[offsets.length - 1] - 1)

  return items
}

type ByteSize = 1 | 2 | 3 | 4

function readBytes(view: Reader, size: ByteSize) {
  switch (size) {
    case 1:
      return view.u8()
    case 2:
      return view.u16()
    case 3:
      return view.u24()
    case 4:
      return view.u32()
  }
}

function readOperator(view: Reader, b0: number) {
  // prettier-ignore
  switch (b0) {
    case 0: return 'version'
    case 1: return 'Notice'
    case 2: return 'FullName'
    case 3: return 'FamilyName'
    case 4: return 'Weight'
    case 5: return 'FontBBox'
    case 6: return 'BlueValues'
    case 7: return 'OtherBlues'
    case 8: return 'FamilyBlues'
    case 9: return 'FamilyOtherBlues'
    case 10: return 'StdHW'
    case 11: return 'StdVW'

    case 12: {
      const b1 = view.u8()

      switch (b1) {
        case 0: return 'Copyright'
        case 1: return 'isFixedPitch'
        case 2: return 'ItalicAngle'
        case 3: return 'UnderlinePosition'
        case 4: return 'UnderlineThickness'
        case 5: return 'PaintType'
        case 6: return 'CharstringType'
        case 7: return 'FontMatrix'
        case 8: return 'StrokeWidth'
        case 9: return 'BlueScale'
        case 10: return 'BlueShift'
        case 11: return 'BlueFuzz'
        case 12: return 'StemSnapH'
        case 13: return 'StemSnapV'
        case 14: return 'ForceBold'
        case 17: return 'LanguageGroup'
        case 18: return 'ExpansionFactor'
        case 19: return 'initialRandomSeed'
        case 20: return 'SyntheticBase'
        case 21: return 'PostScript'
        case 22: return 'BaseFontName'
        case 23: return 'BaseFontBlend'
        default: error('Reserved')
      }

      break
    }

    case 13: return 'UniqueID'
    case 14: return 'XUID'
    case 15: return 'charset'
    case 16: return 'Encoding'
    case 17: return 'CharStrings'
    case 18: return 'Private'
    case 19: return 'Subrs'
    case 20: return 'defaultWidthX'
    case 21: return 'nominalWidthX'
    default: error('Reserved')
  }
}

function readRealNumber(view: Reader) {
  function takeValue(v: number) {
    switch (v) {
      case 0xa:
        return '.'
      case 0xb:
        return 'e'
      case 0xc:
        return 'e-'
      case 0xd:
        error('Reserved')
        break
      case 0xe:
        return '-'
      case 0xf:
        return null
      default:
        return v.toString()
    }
  }

  let v = ''

  while (true) {
    const b = view.u8()
    const high = highNibble(b)
    const low = lowNibble(b)

    const h = takeValue(high)
    const l = takeValue(low)

    if (h != null) {
      v += h

      if (l != null) {
        v += l
        continue
      }
    } else {
      assert(l === null, 'Invalid real number')
    }

    return parseFloat(v)
  }
}

const DECODER = new TextDecoder()

// CharString Type 2 interpreter
interface CharStringPath {
  commands: PathCommand[]
  width: number
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

type PathCommand =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'curveTo'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }

export function parseCharString(
  charString: Uint8Array,
  globalSubrs: Uint8Array[] | null,
  localSubrs: Uint8Array[] | null,
  defaultWidthX = 0,
  nominalWidthX = 0,
): CharStringPath {
  const stack: number[] = []
  const commands: PathCommand[] = []
  let x = 0
  let y = 0
  let width = defaultWidthX
  let hasWidth = false
  let _nStems = 0
  let xMin = Infinity
  let yMin = Infinity
  let xMax = -Infinity
  let yMax = -Infinity

  function updateBounds(px: number, py: number) {
    xMin = Math.min(xMin, px)
    yMin = Math.min(yMin, py)
    xMax = Math.max(xMax, px)
    yMax = Math.max(yMax, py)
  }

  const view = new Reader(charString)

  while (!view.done()) {
    const b0 = view.u8()

    // Parse operands (numbers)
    if (b0 === 28) {
      stack.push(view.i16())
      continue
    } else if (b0 >= 32 && b0 <= 246) {
      stack.push(b0 - 139)
      continue
    } else if (b0 >= 247 && b0 <= 250) {
      const b1 = view.u8()
      stack.push((b0 - 247) * 256 + b1 + 108)
      continue
    } else if (b0 >= 251 && b0 <= 254) {
      const b1 = view.u8()
      stack.push(-(b0 - 251) * 256 - b1 - 108)
      continue
    } else if (b0 === 255) {
      // 32-bit fixed point number (16.16)
      stack.push(view.i32() / 65536)
      continue
    }

    // Parse operators
    let handled = true

    switch (b0) {
      case 1: // hstem
      case 3: // vstem
      case 18: // hstemhm
      case 23: // vstemhm
        _nStems += stack.length >> 1
        if (!hasWidth && stack.length % 2 !== 0) {
          width = nominalWidthX + stack.shift()!
          hasWidth = true
        }
        stack.length = 0
        break

      case 4: // vmoveto
        if (!hasWidth && stack.length > 1) {
          width = nominalWidthX + stack.shift()!
          hasWidth = true
        }
        y += stack.pop()!
        commands.push({ type: 'moveTo', x, y })
        updateBounds(x, y)
        stack.length = 0
        break

      case 5: // rlineto
        while (stack.length > 0) {
          x += stack.shift()!
          y += stack.shift()!
          commands.push({ type: 'lineTo', x, y })
          updateBounds(x, y)
        }
        break

      case 6: // hlineto
        while (stack.length > 0) {
          x += stack.shift()!
          commands.push({ type: 'lineTo', x, y })
          updateBounds(x, y)
          if (stack.length > 0) {
            y += stack.shift()!
            commands.push({ type: 'lineTo', x, y })
            updateBounds(x, y)
          }
        }
        break

      case 7: // vlineto
        while (stack.length > 0) {
          y += stack.shift()!
          commands.push({ type: 'lineTo', x, y })
          updateBounds(x, y)
          if (stack.length > 0) {
            x += stack.shift()!
            commands.push({ type: 'lineTo', x, y })
            updateBounds(x, y)
          }
        }
        break

      case 8: // rrcurveto
        while (stack.length >= 6) {
          const x1 = x + stack.shift()!
          const y1 = y + stack.shift()!
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2 + stack.shift()!
          y = y2 + stack.shift()!
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
        }
        break

      case 10: // callsubr
        {
          const subrIndex = stack.pop()! + calcSubrBias(localSubrs)
          if (localSubrs && subrIndex >= 0 && subrIndex < localSubrs.length) {
            const subr = parseCharString(
              localSubrs[subrIndex],
              globalSubrs,
              localSubrs,
              defaultWidthX,
              nominalWidthX,
            )
            commands.push(...subr.commands)
            if (subr.commands.length > 0) {
              const last = subr.commands[subr.commands.length - 1]
              if (last.type === 'moveTo' || last.type === 'lineTo') {
                x = last.x
                y = last.y
              } else if (last.type === 'curveTo') {
                x = last.x
                y = last.y
              }
            }
          }
        }
        break

      case 11: // return
        // Used to return from subroutine
        break

      case 14: // endchar
        if (!hasWidth && stack.length > 0) {
          width = nominalWidthX + stack.shift()!
          hasWidth = true
        }
        stack.length = 0
        break

      case 21: // rmoveto
        if (!hasWidth && stack.length > 2) {
          width = nominalWidthX + stack.shift()!
          hasWidth = true
        }
        x += stack.shift()!
        y += stack.shift()!
        commands.push({ type: 'moveTo', x, y })
        updateBounds(x, y)
        stack.length = 0
        break

      case 22: // hmoveto
        if (!hasWidth && stack.length > 1) {
          width = nominalWidthX + stack.shift()!
          hasWidth = true
        }
        x += stack.pop()!
        commands.push({ type: 'moveTo', x, y })
        updateBounds(x, y)
        stack.length = 0
        break

      case 24: // rcurveline
        while (stack.length >= 8) {
          const x1 = x + stack.shift()!
          const y1 = y + stack.shift()!
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2 + stack.shift()!
          y = y2 + stack.shift()!
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
        }
        if (stack.length >= 2) {
          x += stack.shift()!
          y += stack.shift()!
          commands.push({ type: 'lineTo', x, y })
          updateBounds(x, y)
        }
        break

      case 25: // rlinecurve
        while (stack.length >= 8) {
          x += stack.shift()!
          y += stack.shift()!
          commands.push({ type: 'lineTo', x, y })
          updateBounds(x, y)
          if (stack.length < 8) break
        }
        if (stack.length >= 6) {
          const x1 = x + stack.shift()!
          const y1 = y + stack.shift()!
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2 + stack.shift()!
          y = y2 + stack.shift()!
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
        }
        break

      case 26: // vvcurveto
        if (stack.length % 2 === 1) {
          x += stack.shift()!
        }
        while (stack.length >= 4) {
          const x1 = x
          const y1 = y + stack.shift()!
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2
          y = y2 + stack.shift()!
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
        }
        break

      case 27: // hhcurveto
        if (stack.length % 2 === 1) {
          y += stack.shift()!
        }
        while (stack.length >= 4) {
          const x1 = x + stack.shift()!
          const y1 = y
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2 + stack.shift()!
          y = y2
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
        }
        break

      case 29: // callgsubr
        {
          const subrIndex = stack.pop()! + calcSubrBias(globalSubrs)
          if (globalSubrs && subrIndex >= 0 && subrIndex < globalSubrs.length) {
            const subr = parseCharString(
              globalSubrs[subrIndex],
              globalSubrs,
              localSubrs,
              defaultWidthX,
              nominalWidthX,
            )
            commands.push(...subr.commands)
            if (subr.commands.length > 0) {
              const last = subr.commands[subr.commands.length - 1]
              if (last.type === 'moveTo' || last.type === 'lineTo') {
                x = last.x
                y = last.y
              } else if (last.type === 'curveTo') {
                x = last.x
                y = last.y
              }
            }
          }
        }
        break

      case 30: // vhcurveto
        while (stack.length >= 4) {
          const x1 = x
          const y1 = y + stack.shift()!
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          x = x2 + stack.shift()!
          y = y2 + (stack.length === 1 ? stack.shift()! : 0)
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
          if (stack.length < 4) break

          const x1h = x + stack.shift()!
          const y1h = y
          const x2h = x1h + stack.shift()!
          const y2h = y1h + stack.shift()!
          y = y2h + stack.shift()!
          x = x2h + (stack.length === 1 ? stack.shift()! : 0)
          commands.push({ type: 'curveTo', x1: x1h, y1: y1h, x2: x2h, y2: y2h, x, y })
          updateBounds(x1h, y1h)
          updateBounds(x2h, y2h)
          updateBounds(x, y)
        }
        break

      case 31: // hvcurveto
        while (stack.length >= 4) {
          const x1 = x + stack.shift()!
          const y1 = y
          const x2 = x1 + stack.shift()!
          const y2 = y1 + stack.shift()!
          y = y2 + stack.shift()!
          x = x2 + (stack.length === 1 ? stack.shift()! : 0)
          commands.push({ type: 'curveTo', x1, y1, x2, y2, x, y })
          updateBounds(x1, y1)
          updateBounds(x2, y2)
          updateBounds(x, y)
          if (stack.length < 4) break

          const x1v = x
          const y1v = y + stack.shift()!
          const x2v = x1v + stack.shift()!
          const y2v = y1v + stack.shift()!
          x = x2v + stack.shift()!
          y = y2v + (stack.length === 1 ? stack.shift()! : 0)
          commands.push({ type: 'curveTo', x1: x1v, y1: y1v, x2: x2v, y2: y2v, x, y })
          updateBounds(x1v, y1v)
          updateBounds(x2v, y2v)
          updateBounds(x, y)
        }
        break

      default:
        handled = false
        break
    }

    if (!handled) {
      // Handle two-byte operators
      if (b0 === 12) {
        view.u8() // Read and ignore the second byte
        // Additional operators can be added here if needed
        stack.length = 0
      } else {
        // Unknown operator - clear stack
        stack.length = 0
      }
    }
  }

  return {
    commands,
    width,
    xMin: isFinite(xMin) ? xMin : 0,
    yMin: isFinite(yMin) ? yMin : 0,
    xMax: isFinite(xMax) ? xMax : 0,
    yMax: isFinite(yMax) ? yMax : 0,
  }
}

function calcSubrBias(subrs: Uint8Array[] | null): number {
  if (!subrs) return 0
  const count = subrs.length
  if (count < 1240) return 107
  if (count < 33900) return 1131
  return 32768
}
