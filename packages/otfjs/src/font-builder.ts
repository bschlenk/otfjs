// need some high level metrics?
// obviously font name
// kind of font we want to make? ttf vs otto (let's start with ttf)
// glyphs !== code points, how do you specify composite glyphs? I think
// for the most part we can start with character == glyph (for this
// font at least)

import { Writer } from './buffer/writer.js'
import { computeChecksum } from './checksum.js'
import { SfntVersion } from './enums.js'
import { padToMultiple } from './utils/utils.js'

export function buildFont(props: {
  sfntVersion: SfntVersion
  tables: Record<string, Writer | ArrayBuffer | Uint8Array>
}) {
  let tableOffset = 12
  let tablesSize = 0
  for (const table of Object.values(props.tables)) {
    tableOffset += 16
    tablesSize += padToMultiple(table.byteLength, 4)
  }

  const writer = new Writer(tableOffset + tablesSize)

  const tags = Object.keys(props.tables).sort()
  const numTables = tags.length
  const searchRange = 2 ** Math.floor(Math.log2(numTables)) * 16

  writer.u32(props.sfntVersion)
  writer.u16(numTables)
  writer.u16(searchRange)
  writer.u16(Math.floor(Math.log2(numTables)))
  writer.u16(numTables * 16 - searchRange)

  for (const tag of tags) {
    const table = props.tables[tag]
    const checksum = computeChecksumHelper(table)
    const offset = tableOffset
    const length = table.byteLength
    tableOffset += padToMultiple(length, 4)

    writer.tag(tag)
    writer.u32(checksum)
    writer.u32(offset)
    writer.u32(length)
  }

  // TODO: need to correct checksum of head table

  for (const tag of tags) {
    const table = props.tables[tag]
    writer.buffer(table, 4)
  }

  return writer.toBuffer()
}

function computeChecksumHelper(data: Writer | ArrayBuffer | Uint8Array) {
  if (data instanceof Writer) return data.checksum()

  const view = new DataView(data instanceof ArrayBuffer ? data : data.buffer)
  return computeChecksum(view)
}
