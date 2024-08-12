import { Reader } from '../buffer/reader.js'
import { PostscriptGlyphName } from '../postscript.js'
import { toHex } from '../utils/utils.js'

interface PostTableBase<T extends number> {
  version: T
  italicAngle: number
  underlinePosition: number
  underlineThickness: number
  isFixedPitch: number
  minMemType42: number
  maxMemType42: number
  minMemType1: number
  maxMemType1: number
}

type PostTableV1 = PostTableBase<0x00010000>

type IPostTableV2Behaviors = typeof PostTableV2Behaviors

interface PostTableV2 extends PostTableBase<0x00020000>, IPostTableV2Behaviors {
  numGlyphs: number
  glyphNameIndexes: number[]
  stringData: DataView
}

type PostTableV3 = PostTableBase<0x00030000>

export type PostTable = PostTableV1 | PostTableV2 | PostTableV3

export function readPostTable(view: Reader): PostTable {
  const version = view.u32()

  let table: PostTableV1 | PostTableV2 | PostTableV3

  switch (version) {
    case 0x00010000:
    case 0x00030000:
      table = Object.create(null)
      break
    case 0x00020000:
      table = Object.create(PostTableV2Behaviors)
      break
    default:
      throw new Error(`Unexpected post table version: ${toHex(version)}`)
  }

  table.version = version
  table.italicAngle = view.i32()
  table.underlinePosition = view.i16()
  table.underlineThickness = view.i16()
  table.isFixedPitch = view.u32()
  table.minMemType42 = view.u32()
  table.maxMemType42 = view.u32()
  table.minMemType1 = view.u32()
  table.maxMemType1 = view.u32()

  if (table.version === 0x00020000) {
    table.numGlyphs = view.u16()
    table.glyphNameIndexes = view.array(table.numGlyphs, () => view.u16())
    table.stringData = view.dataview()
  }

  return table
}

const PostTableV2Behaviors = {
  lookupGlyphName(this: PostTableV2, glyphIndex: number) {
    const nameIndex = this.glyphNameIndexes[glyphIndex]
    if (nameIndex < 258) {
      return PostscriptGlyphName[nameIndex]
    }

    let offset = 0
    let strings = nameIndex - 258
    while (strings--) {
      offset += this.stringData.getUint8(offset)
    }

    const length = this.stringData.getUint8(offset++)
    let glyphName = ''
    for (let i = 0; i < length; ++i) {
      glyphName += String.fromCharCode(this.stringData.getUint8(offset++))
      offset++
    }

    return glyphName
  },
}
