import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
import { writerFor } from '../table-writer.js'
import {
  type MathTable as MathTableType,
  readMathTable,
  writeMathTable,
} from './math.gen.js'

export { readMathTable, writeMathTable } from './math.gen.js'

export type MathTable = MathTableType

export const MathTag = 'MATH'

export const MathTableReader = /* @__PURE__ */ readerFor<MathTable>(
  MathTag,
  readMathTable,
)

export const MathTableWriter = /* @__PURE__ */ writerFor<MathTable>(
  MathTag,
  writeMathTable,
)

export const MathTable = /* @__PURE__ */ tableFor(
  MathTableReader,
  MathTableWriter,
)
