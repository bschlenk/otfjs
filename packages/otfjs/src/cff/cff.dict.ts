import type { Reader } from '@otfjs/buffer'

import { highNibble, lowNibble } from '../utils/bit.js'
import { assert } from '../utils/utils.js'

/**
 * A CFF DICT, from each operator's name to its operands. Operators that
 * take a string take a SID: an index into the standard strings, or past
 * them into the table's String INDEX.
 */
export type CffDict = Record<string, number[]>

/** Operators of Top DICTs and the Font DICTs of CID-keyed fonts. */
// prettier-ignore
export const TOP_DICT_OPERATORS: Record<number, string> = {
  0: 'version', 1: 'Notice', 2: 'FullName', 3: 'FamilyName', 4: 'Weight',
  5: 'FontBBox', 13: 'UniqueID', 14: 'XUID', 15: 'charset', 16: 'Encoding',
  17: 'CharStrings', 18: 'Private',
  1200: 'Copyright', 1201: 'isFixedPitch', 1202: 'ItalicAngle',
  1203: 'UnderlinePosition', 1204: 'UnderlineThickness', 1205: 'PaintType',
  1206: 'CharstringType', 1207: 'FontMatrix', 1208: 'StrokeWidth',
  1220: 'SyntheticBase', 1221: 'PostScript', 1222: 'BaseFontName',
  1223: 'BaseFontBlend', 1230: 'ROS', 1231: 'CIDFontVersion',
  1232: 'CIDFontRevision', 1233: 'CIDFontType', 1234: 'CIDCount',
  1235: 'UIDBase', 1236: 'FDArray', 1237: 'FDSelect', 1238: 'FontName',
}

/** Operators of Private DICTs. */
// prettier-ignore
export const PRIVATE_DICT_OPERATORS: Record<number, string> = {
  6: 'BlueValues', 7: 'OtherBlues', 8: 'FamilyBlues', 9: 'FamilyOtherBlues',
  10: 'StdHW', 11: 'StdVW', 19: 'Subrs', 20: 'defaultWidthX',
  21: 'nominalWidthX',
  1209: 'BlueScale', 1210: 'BlueShift', 1211: 'BlueFuzz', 1212: 'StemSnapH',
  1213: 'StemSnapV', 1214: 'ForceBold', 1217: 'LanguageGroup',
  1218: 'ExpansionFactor', 1219: 'initialRandomSeed',
}

/**
 * Read a DICT that fills the whole reader. Operators missing from
 * `operators` are kept by number, like `op1250`.
 */
export function readCffDict(
  view: Reader,
  operators: Record<number, string>,
): CffDict {
  const dict: CffDict = {}
  let operands: number[] = []

  while (!view.done()) {
    const b0 = view.u8()

    if (b0 <= 21) {
      const op = b0 === 12 ? 1200 + view.u8() : b0
      dict[operators[op] ?? `op${op}`] = operands
      operands = []
    } else if (b0 === 28) {
      operands.push(view.i16())
    } else if (b0 === 29) {
      operands.push(view.i32())
    } else if (b0 === 30) {
      operands.push(readRealNumber(view))
    } else if (b0 >= 32 && b0 <= 246) {
      operands.push(b0 - 139)
    } else if (b0 >= 247 && b0 <= 250) {
      operands.push((b0 - 247) * 256 + view.u8() + 108)
    } else if (b0 >= 251 && b0 <= 254) {
      operands.push(-(b0 - 251) * 256 - view.u8() - 108)
    } else {
      throw new Error(`Reserved CFF DICT byte ${b0}`)
    }
  }

  return dict
}

/** A real number operand: nibbles of digits, ending in 0xf. */
function readRealNumber(view: Reader) {
  let s = ''

  while (true) {
    const b = view.u8()
    for (const nibble of [highNibble(b), lowNibble(b)]) {
      if (nibble === 0xf) return parseFloat(s)
      assert(nibble !== 0xd, 'Reserved nibble in CFF real number')
      s += REAL_NIBBLES[nibble]
    }
  }
}

// prettier-ignore
const REAL_NIBBLES = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.', 'E', 'E-', '', '-',
]
