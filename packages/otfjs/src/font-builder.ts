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
import { asDataView } from './buffer/utils.js'

export function buildFont(props: {
  // Defaults to OPEN_TYPE
  sfntVersion?: SfntVersion
  tables: Record<string, Uint8Array>
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

  writer.u32(props.sfntVersion ?? SfntVersion.OPEN_TYPE)
  writer.u16(numTables)
  writer.u16(searchRange)
  writer.u16(Math.floor(Math.log2(numTables)))
  writer.u16(numTables * 16 - searchRange)

  let headOffset = 0

  for (const tag of tags) {
    const table = props.tables[tag]
    const offset = tableOffset
    const length = table.byteLength

    if (tag === 'head') {
      // the head table's checksumAdjustment field must be cleared before
      // we compute its checksum
      const data = asDataView(table)
      data.setUint32(8, 0)
      headOffset = offset
    }

    const checksum = computeChecksum(table)
    tableOffset += padToMultiple(length, 4)

    writer.tag(tag)
    writer.u32(checksum)
    writer.u32(offset)
    writer.u32(length)
  }

  for (const tag of tags) {
    const table = props.tables[tag]
    writer.buffer(table, 4)
  }

  const checksum = writer.checksum()
  writer.at(headOffset + 8, (w) => w.u32(0xb1b0afba - checksum))

  return writer.toBuffer()
}
