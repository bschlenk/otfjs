import { Reader } from '../buffer/reader.js'
import { NameId, PlatformId } from '../enums.js'

export type NameTable = ReturnType<typeof readNameTable>

export function readNameTable(view: Reader) {
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

    return {
      platformId,
      platformIdStr: PlatformId[platformId],
      encodingId,
      languageId,
      nameId,
      nameIdStr: NameId[nameId],
      get value() {
        return DECODER.decode(
          view.dataview(storageOffset + stringOffset, length),
        )
      },
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

const DECODER = new TextDecoder('utf-16be')
