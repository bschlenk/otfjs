import { NameId, PlatformId } from '../enums.js'
import { Reader } from '../buffer.js'

export interface NameTable {}

export function readNameTable(view: Reader): NameTable {
  const version = view.u16()

  const count = view.u16()
  const storageOffset = view.u16()

  const nameRecords = view.array(count, () => {
    const platformId = view.u16()
    const encodingId = view.u16()
    const languageId = view.u16()
    const nameId = view.u16()
    const length = view.u16()
    const stringOffset = view.u16()

    const value = decoder.decode(
      view.dataview(storageOffset + stringOffset, length),
    )

    return {
      platformId,
      platformIdStr: PlatformId[platformId],
      encodingId,
      languageId,
      nameId,
      nameIdStr: NameId[nameId],
      value,
    }
  })

  if (version === 1) {
    const langTagCount = view.u16()
    const langTagRecords = view.array(langTagCount, () => {
      const length = view.u16()
      const offset = view.u16()
      return { length, offset }
    })

    return { version, nameRecords, langTagRecords }
  }

  return { version, nameRecords }
}

const decoder = new TextDecoder('utf-16be')
