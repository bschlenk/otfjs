import { Reader } from '../buffer.js'
import { PostscriptGlyphName } from '../postscript.js'

interface PostTableV1 {
  version: 0x00010000
  italicAngle: number
  underlinePosition: number
  underlineThickness: number
  isFixedPitch: number
  minMemType42: number
  maxMemType42: number
  minMemType1: number
  maxMemType1: number
}

type IPostTableV2Behaviors = typeof PostTableV2Behaviors

interface PostTableV2
  extends Omit<PostTableV1, 'version'>,
    IPostTableV2Behaviors {
  version: 0x00020000
  numGlyphs: number
  glyphNameIndexes: number[]
  stringData: DataView
}

export type PostTable = PostTableV1 | PostTableV2

export function readPostTable(view: Reader) {
  const version = view.u32()

  let table: PostTable

  switch (version) {
    case 0x00010000:
      table = Object.create(null)
      break
    case 0x00020000:
      table = Object.create(PostTableV2Behaviors)
      break
    default:
      throw new Error(`Unexpected post table version: ${version}`)
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

  if (version === 0x00020000) {
    const tableV2 = table as PostTableV2
    tableV2.numGlyphs = view.u16()
    tableV2.glyphNameIndexes = view.array(tableV2.numGlyphs, () => view.u16())
    tableV2.stringData = view.dataview()
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
