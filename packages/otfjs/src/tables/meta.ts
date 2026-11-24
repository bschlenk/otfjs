// https://learn.microsoft.com/en-us/typography/opentype/spec/meta

import { Reader, Writer } from '@otfjs/buffer'

import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { utf8Decoder, utf8Encoder } from '../utils/text.js'
import { sortByString } from '../utils/utils.js'

export interface MetaTable {
  version: number
  flags: number
  /**
   * The `dlng` entry: the languages or scripts the font was designed for, as
   * ScriptLangTags like `en`, `zh-Hant` or `Latn`. Null if absent.
   */
  designLanguages: string[] | null
  /**
   * The `slng` entry: the languages or scripts the font can render, which may
   * be more than it was designed for. Null if absent.
   */
  supportedLanguages: string[] | null
  /** Entries under any other tag, as raw bytes. */
  other: MetaDataMap[]
}

export interface MetaDataMap {
  tag: string
  data: Uint8Array
}

export function readMetaTable(view: Reader): MetaTable {
  const version = view.u32()
  const flags = view.u32()
  view.skip(4) // reserved
  const dataMapsCount = view.u32()

  let designLanguages: string[] | null = null
  let supportedLanguages: string[] | null = null
  const other: MetaDataMap[] = []

  for (let i = 0; i < dataMapsCount; ++i) {
    const tag = view.tag()
    const dataOffset = view.u32()
    const dataLength = view.u32()
    const data = view.subtable(dataOffset, dataLength).data

    if (tag === 'dlng') {
      designLanguages = parseLanguages(data)
    } else if (tag === 'slng') {
      supportedLanguages = parseLanguages(data)
    } else {
      other.push({ tag, data })
    }
  }

  return { version, flags, designLanguages, supportedLanguages, other }
}

export function writeMetaTable(table: MetaTable): Uint8Array {
  const dataMaps: MetaDataMap[] = [...table.other]
  if (table.designLanguages) {
    dataMaps.push({ tag: 'dlng', data: encodeLanguages(table.designLanguages) })
  }
  if (table.supportedLanguages) {
    dataMaps.push({
      tag: 'slng',
      data: encodeLanguages(table.supportedLanguages),
    })
  }
  sortByString(dataMaps, 'tag')

  const headerSize = 16 + dataMaps.length * 12
  const w = new Writer(headerSize)

  w.u32(table.version)
  w.u32(table.flags)
  w.u32(0) // reserved
  w.u32(dataMaps.length)

  let offset = headerSize
  for (const { tag, data } of dataMaps) {
    w.tag(tag)
    w.u32(offset)
    w.u32(data.byteLength)
    offset += data.byteLength
  }

  for (const { data } of dataMaps) w.buffer(data)

  return w.toBuffer()
}

export const MetaTag = 'meta'

export const MetaTableReader: TableReader<MetaTable> = {
  tag: MetaTag,
  read: readMetaTable,
}

export const MetaTableWriter: TableWriter<MetaTable> = {
  tag: MetaTag,
  write: writeMetaTable,
}

/** `dlng` and `slng` hold comma-separated tags, optionally with spaces. */
function parseLanguages(data: Uint8Array): string[] {
  return utf8Decoder
    .decode(data)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function encodeLanguages(tags: string[]): Uint8Array {
  return utf8Encoder.encode(tags.join(','))
}
