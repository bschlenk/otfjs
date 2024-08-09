import decompress from 'brotli/decompress.js'

import { Reader } from '../buffer/reader.js'
import { type Writer } from '../buffer/writer.js'
import { buildFont } from '../font-builder.js'
import { assert, error } from '../utils/utils.js'
import { writeGlyfTable } from '../writers/glyf.js'
import { writeLocaTable } from '../writers/loca.js'
import { decodeGlyfTransform0 } from './glyf-transform.js'
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

  const _flavor = view.u32()
  const _length = view.u32()
  const numTables = view.u16()

  view.skip(2) // reserved

  const _totalSfntSize = view.u32()
  const _totalCompressedSize = view.u32()
  const _majorVersion = view.u16()
  const _minorVersion = view.u16()
  const _metaOffset = view.u32()
  const _metaLength = view.u32()
  const _metaOrigLength = view.u32()
  const _privOffset = view.u32()
  const _privLength = view.u32()

  // start reading table entries

  const tableInfo: TableDirectoryEntry[] = view.array(numTables, () => {
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
    data.length === tableInfo.reduce((acc, t) => acc + t.length, 0),
    'Unexpected decompressed stream size',
  )

  const loca: number[] = []
  let locaEncountered = false
  let offset = 0
  const tables: Record<string, Writer | Uint8Array> = {}

  for (const table of tableInfo) {
    const buff = new Uint8Array(data, offset, table.length)
    offset += table.length

    if (table.isNullTransform) {
      tables[table.tag] = buff
      continue
    }

    switch (table.tag) {
      case 'glyf': {
        if (table.transform !== 0) {
          error(`Unrecognized glyf transform ${table.transform}`)
        }

        if (locaEncountered) {
          error('Encountered loca table before glyf table')
        }

        const { glyphs, indexFormat } = decodeGlyfTransform0(buff)
        tables[table.tag] = writeGlyfTable(glyphs, loca)
        tables['loca'] = writeLocaTable(loca, indexFormat)

        break
      }

      case 'loca': {
        if (table.transform !== 0) {
          error(`Unrecognized loca transform ${table.transform}`)
        }

        locaEncountered = true
        break
      }

      case 'hmtx': {
        if (table.transform !== 1) {
          error(`Unrecognized hmtx transform ${table.transform}`)
        }

        error('TODO: decode hmtx transform 1')
        // decodeHmtxTransform0(``)
        break
      }

      default:
        error(`Unexpected transform ${table.transform} for table ${table.tag}`)
    }
  }

  if (loca.length && !locaEncountered) {
    error('Expected entry for loca table after glyf table')
  }

  return buildFont({ tables })
}
