import { type Reader } from '../buffer/reader.js'
import { highNibble, lowNibble } from '../utils/bit.js'
import { assert, error } from '../utils/utils.js'

export type CffTable = ReturnType<typeof readCffTable>

const INVALID_DICT_VALUES = new Set([22, 23, 24, 25, 26, 27, 31, 255])

export function readCffTable(view: Reader) {
  const major = view.u8()
  const minor = view.u8()
  const hdrSize = view.u8()
  const offSize = view.u8()

  view.skip(hdrSize - 4)

  const names = readIndex(view, (data) => DECODER.decode(data.data))

  const topDicts = readIndex(view, (data) => {
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
      }

      values.push(r)
    }

    return Object.fromEntries(entries)
  })

  const strings = readIndex(view, (data) => DECODER.decode(data.data))

  return {
    major,
    minor,
    hdrSize,
    offSize,
    names,
    topDicts,
    strings,
  }
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
