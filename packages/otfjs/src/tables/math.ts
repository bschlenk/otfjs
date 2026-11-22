import { readerFor } from '../table-reader.js'
import { writerFor } from '../table-writer.js'
import {
  type MathTable as MathTableType,
  readMathTable,
  writeMathTable,
} from './math.gen.js'

export { readMathTable, writeMathTable } from './math.gen.js'

export type MathTable = MathTableType

export const MathTag = 'MATH'

export const MathTableReader = readerFor<MathTable>(MathTag, readMathTable)

export const MathTableWriter = writerFor<MathTable>(MathTag, writeMathTable)

export const MathTable = { ...MathTableReader, ...MathTableWriter }
