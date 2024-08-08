import decompress from 'brotli/decompress.js'

import { Reader, Writer } from '../buffer.js'
import { assert, error } from '../utils/utils.js'
import { KNOWN_TAGS } from './tags.js'

// wOF2
const SIGNATURE = 0x774f4632

interface TableDirectoryEntry {
  tag: string
  transform: number
  isNullTransform: boolean
  length: number
}

export function decodeWoff2File(buffer: ArrayBuffer) /*: ArrayBuffer*/ {
  const view = new Reader(buffer)

  if (view.u32() !== SIGNATURE) error('Invalid WOFF2 signature')

  const flavor = view.u32()
  const length = view.u32()
  const numTables = view.u16()

  view.skip(2) // reserved

  const totalSfntSize = view.u32()
  const totalCompressedSize = view.u32()
  const majorVersion = view.u16()
  const minorVersion = view.u16()
  const metaOffset = view.u32()
  const metaLength = view.u32()
  const metaOrigLength = view.u32()
  const privOffset = view.u32()
  const privLength = view.u32()

  // start reading table entries

  const tables: TableDirectoryEntry[] = view.array(numTables, () => {
    const flags = view.u8()
    const tagIndex = flags & 0x3f
    const transform = (flags >>> 6) & 0b11
    const tag = tagIndex === 0x3f ? view.tag() : KNOWN_TAGS[tagIndex]
    const origLength = view.uBase128()

    const isNullTransform =
      tag === 'glyf' || tag === 'loca' ? transform === 3 : transform === 0

    const length = isNullTransform ? origLength : view.uBase128()

    return { tag, transform, isNullTransform, length }
  })

  const data = decompress(Buffer.from(view.data, view.offset))
  assert(
    data.length === tables.reduce((acc, t) => acc + t.length, 0),
    'Unexpected decompressed stream size',
  )

  let loca = null
  let offset = 0
  const tableMap: Record<string, Writer | Uint8Array> = {}

  for (const table of tables) {
    const buff = new Uint8Array(data, offset, table.length)
    offset += table.length

    if (table.isNullTransform) {
      tableMap[table.tag] = buff
      continue
    }

    switch (table.tag) {
      case 'glyf': {
        if (table.transform !== 0) {
          error(`Unrecognized glyf transform ${table.transform}`)
        }

        const result = decodeGlyfTransform0(buff)
        tableMap[table.tag] = result.buffer
        loca = result.loca
        break
      }

      case 'loca': {
        if (table.transform !== 0) {
          error(`Unrecognized loca transform ${table.transform}`)
        }

        // already decoded as part of glyf decode
        break
      }

      case 'hmtx': {
        if (table.transform !== 1) {
          error(`Unrecognized hmtx transform ${table.transform}`)
        }

        decodeHmtxTransform0(``)

        break
      }

      default:
        error(`Unexpected transform ${table.transform} for table ${table.tag}`)
    }
  }

  // need to:
  // sort the tables by tag
  // reconstruct the font file header w/ tables
  // reverse-transform any transformed tables
  // reconstruct the loca table based on glyphs
  // handle checksums

  return {
    flavor,
    length,
    numTables,
    totalSfntSize,
    totalCompressedSize,
    majorVersion,
    minorVersion,
    metaOffset,
    metaLength,
    metaOrigLength,
    privOffset,
    privLength,
    tables,
  }
}
