import { Reader } from '../buffer/reader.js'

export type MathTable = ReturnType<typeof readMathTable>

export function readMathTable(view: Reader) {
  const majorVersion = view.u16()
  const minorVersion = view.u16()
  const mathConstantsOffset = view.u16()
  const mathGlyphInfoOffset = view.u16()
  const mathVariantsOffset = view.u16()

  return {
    majorVersion,
    minorVersion,
    mathConstantsOffset,
    mathGlyphInfoOffset,
    mathVariantsOffset,
  }
}
