import { Writer } from '../buffer.js'
import { NameId } from '../enums.js'

interface NameRecord {
  nameId: NameId
  value: string
}

export function writeNameTable(names: NameRecord[]) {
  // by default we'll use a windows encoding for english
  const platformId = 3
  const encodingId = 1
  const languageId = 0x0409

  const storageOffset = 6 + names.length * 12
  let offset = 0

  const writer = new Writer()
  writer.u16(0) // table version
  writer.u16(names.length)
  writer.u16(storageOffset)

  for (const name of names) {
    const length = encodeUtf16(name.value, writer, storageOffset + offset)
    writer.u16(platformId)
    writer.u16(encodingId)
    writer.u16(languageId)
    writer.u16(name.nameId)
    writer.u16(length)
    writer.u16(offset)
    offset += length
  }

  return writer
}

function encodeUtf16(str: string, writer: Writer, offset: number) {
  return writer.at(offset, (w) => {
    w.utf16(str)
  })
}
