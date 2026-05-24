// https://learn.microsoft.com/en-us/typography/opentype/spec/name

import { Reader, Writer } from '@otfjs/buffer'

import { NameId, PlatformId } from '../enums.js'

export interface NameRecord {
  platformId: number
  encodingId: number
  languageId: number
  nameId: number
  value: string
}

export interface NameTable {
  version: 0
  nameRecords: NameRecord[]
}

export interface NameTableV1 {
  version: 1
  nameRecords: NameRecord[]
  langTagRecords: NameRecord[]
}

export function readNameTable(view: Reader): NameTable | NameTableV1 {
  const version = view.u16()
  const count = view.u16()
  const storageOffset = view.u16()

  const nameRecords: NameRecord[] = view.array(count, () => {
    const platformId = view.u16()
    const encodingId = view.u16()
    const languageId = view.u16()
    const nameId = view.u16()
    const length = view.u16()
    const stringOffset = view.u16()

    return {
      platformId,
      get platformIdStr() {
        return PlatformId[platformId]
      },
      encodingId,
      languageId,
      nameId,
      get nameIdStr() {
        return NameId[nameId]
      },
      get value() {
        return DECODER.decode(
          view.dataview(storageOffset + stringOffset, length),
        )
      },
    }
  })

  if (version === 1) {
    const langTagCount = view.u16()
    const langTagRecords: NameRecord[] = view.array(langTagCount, () => {
      const length = view.u16()
      const offset = view.u16()
      return {
        platformId: 0,
        encodingId: 0,
        languageId: 0,
        nameId: 0,
        get value() {
          return DECODER.decode(view.dataview(storageOffset + offset, length))
        },
      }
    })
    return { version, nameRecords, langTagRecords }
  }

  return { version: 0, nameRecords }
}

export function writeNameTable(table: NameTable | NameTableV1): Uint8Array {
  const langTagRecords = table.version === 1 ? table.langTagRecords : []
  const allRecords = [...table.nameRecords, ...langTagRecords]

  // Pre-compute byte lengths and storage offsets (UTF-16BE: 2 bytes per code unit)
  const lengths = allRecords.map((r) => r.value.length * 2)
  const offsets: number[] = []
  let totalStringBytes = 0
  for (const len of lengths) {
    offsets.push(totalStringBytes)
    totalStringBytes += len
  }

  // storageOffset = header (6) + nameRecords (count * 12) + v1 lang tag section
  const langTagSectionSize = table.version === 1 ? 2 + langTagRecords.length * 4 : 0
  const storageOffset = 6 + table.nameRecords.length * 12 + langTagSectionSize

  const w = new Writer(storageOffset + totalStringBytes)

  w.u16(table.version)
  w.u16(table.nameRecords.length)
  w.u16(storageOffset)

  table.nameRecords.forEach((r, i) => {
    w.u16(r.platformId)
    w.u16(r.encodingId)
    w.u16(r.languageId)
    w.u16(r.nameId)
    w.u16(lengths[i])
    w.u16(offsets[i])
  })

  if (table.version === 1) {
    w.u16(langTagRecords.length)
    langTagRecords.forEach((r, i) => {
      const idx = table.nameRecords.length + i
      w.u16(lengths[idx])
      w.u16(offsets[idx])
    })
  }

  for (const r of allRecords) {
    w.utf16(r.value)
  }

  return w.toBuffer()
}

const DECODER = new TextDecoder('utf-16be')
