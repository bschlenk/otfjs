import { describe, expect, it } from 'vitest'

import { buildFont } from '../font-builder.js'
import { FontHandle } from '../font-handle.js'
import {
  type MetaTable,
  MetaTableReader,
  MetaTableWriter,
  MetaTag,
} from './meta.js'

describe('meta', () => {
  it('round-trips language and raw entries', () => {
    const meta: MetaTable = {
      version: 1,
      flags: 0,
      designLanguages: ['zh-Hant'],
      supportedLanguages: ['Latn', 'zh-Hant', 'zh-Hans'],
      other: [{ tag: 'appl', data: new Uint8Array([1, 2, 3]) }],
    }

    expect(readMeta(MetaTableWriter.write(meta))).toEqual(meta)
  })

  it('reads a table without language entries', () => {
    const meta: MetaTable = {
      version: 1,
      flags: 0,
      designLanguages: null,
      supportedLanguages: null,
      other: [],
    }

    expect(readMeta(MetaTableWriter.write(meta))).toEqual(meta)
  })

  it('trims spaces and skips empty tags in language lists', () => {
    const text = new TextEncoder().encode(' ko, Kore ,,en ')
    const data = new Uint8Array(16 + 12 + text.byteLength)
    const view = new DataView(data.buffer)
    view.setUint32(0, 1) // version
    view.setUint32(12, 1) // dataMapsCount
    data.set(new TextEncoder().encode('dlng'), 16)
    view.setUint32(20, 28) // dataOffset
    view.setUint32(24, text.byteLength) // dataLength
    data.set(text, 28)

    expect(readMeta(data).designLanguages).toEqual(['ko', 'Kore', 'en'])
  })
})

function readMeta(data: Uint8Array) {
  const font = new FontHandle(buildFont({ tables: { [MetaTag]: data } }))
  return font.readTable(MetaTableReader)
}
