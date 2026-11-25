/**
 * Scripts with hand-picked preview samples, for `getSampleText`: the
 * characters each covers and the `dlng` codes that pick it.
 */

export interface Script {
  /** ISO 15924 codes that pick this script in `dlng`, like `Cyrl`. */
  codes: string[]
  /** Language codes that pick this script in `dlng`, like `ru`. */
  languages: string[]
  /**
   * Code point ranges, inclusive, for grouping a font's letters. Empty for
   * scripts only picked through `dlng`.
   */
  ranges: [number, number][]
  /** Samples to use, best first; the first the font fully covers wins. */
  samples: string[]
}

export const LATIN: Script = {
  codes: ['latn'],
  languages: [],
  ranges: [
    [0x41, 0x5a],
    [0x61, 0x7a],
    [0xc0, 0x24f],
  ],
  samples: ['Aa'],
}

/** Traditional Chinese, only picked through `dlng`; Han letters are `Hani`. */
export const HANT: Script = {
  codes: ['hant'],
  languages: ['yue'],
  ranges: [],
  samples: ['漢'],
}

/** Scripts with hand-picked samples. Codes and languages are lowercase. */
export const SCRIPTS: Script[] = [
  LATIN,
  defineScript('grek', ['el'], [[0x370, 0x3ff]], ['Ωω']),
  defineScript(
    'cyrl',
    ['be', 'bg', 'mk', 'mn', 'ru', 'sr', 'uk'],
    [[0x400, 0x52f]],
    ['Бб'],
  ),
  defineScript('armn', ['hy'], [[0x531, 0x58f]], ['Աա']),
  defineScript('hebr', ['he', 'yi'], [[0x591, 0x5ff]], ['א']),
  defineScript(
    'arab',
    ['ar', 'fa', 'ps', 'ur'],
    [
      [0x600, 0x6ff],
      [0x750, 0x77f],
      [0x8a0, 0x8ff],
    ],
    ['ع'],
  ),
  defineScript('deva', ['hi', 'mr', 'ne', 'sa'], [[0x900, 0x97f]], ['क']),
  defineScript('beng', ['bn'], [[0x980, 0x9ff]], ['ক']),
  defineScript('guru', ['pa'], [[0xa00, 0xa7f]], ['ਕ']),
  defineScript('gujr', ['gu'], [[0xa80, 0xaff]], ['ક']),
  defineScript('orya', ['or'], [[0xb00, 0xb7f]], ['କ']),
  defineScript('taml', ['ta'], [[0xb80, 0xbff]], ['க']),
  defineScript('telu', ['te'], [[0xc00, 0xc7f]], ['క']),
  defineScript('knda', ['kn'], [[0xc80, 0xcff]], ['ಕ']),
  defineScript('mlym', ['ml'], [[0xd00, 0xd7f]], ['ക']),
  defineScript('sinh', ['si'], [[0xd80, 0xdff]], ['ක']),
  defineScript('thai', ['th'], [[0xe01, 0xe7f]], ['ก']),
  defineScript('laoo', ['lo'], [[0xe81, 0xeff]], ['ກ']),
  defineScript('tibt', ['bo'], [[0xf00, 0xfff]], ['ཀ']),
  defineScript('mymr', ['my'], [[0x1000, 0x109f]], ['က']),
  defineScript('geor', ['ka'], [[0x10a0, 0x10ff]], ['Ⴀა', 'ა']),
  {
    codes: ['hang', 'kore'],
    languages: ['ko'],
    ranges: [
      [0xac00, 0xd7a3],
      [0x1100, 0x11ff],
      [0x3131, 0x318e],
    ],
    samples: ['동'],
  },
  defineScript('ethi', ['am', 'ti'], [[0x1200, 0x139f]], ['አ']),
  defineScript('cher', ['chr'], [[0x13a0, 0x13ff]], ['Ꮳꮳ', 'Ꮳ']),
  defineScript('khmr', ['km'], [[0x1780, 0x17ff]], ['ក']),
  defineScript('mong', [], [[0x1800, 0x18af]], ['ᠮ']),
  {
    codes: ['kana', 'hira', 'jpan'],
    languages: ['ja'],
    ranges: [[0x3041, 0x30ff]],
    samples: ['あ'],
  },
  {
    // Simplified Chinese is the default for Han letters.
    codes: ['hani', 'hans'],
    languages: ['zh'],
    ranges: [
      [0x4e00, 0x9fff],
      [0x3400, 0x4dbf],
    ],
    samples: ['汉', '漢'],
  },
  HANT,
  defineScript('phag', [], [[0xa840, 0xa877]], ['ꡀ']),
]

/** Regions that write Chinese with Traditional characters. */
export const HANT_REGIONS = new Set(['tw', 'hk', 'mo'])

/** A script picked by one code, for `SCRIPTS`. */
function defineScript(
  code: string,
  languages: string[],
  ranges: [number, number][],
  samples: string[],
): Script {
  return { codes: [code], languages, ranges, samples }
}
