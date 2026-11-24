import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { type MathTable, readMathTable, writeMathTable } from './math.gen.js'

export { type MathTable, readMathTable, writeMathTable } from './math.gen.js'

export const MathTag = 'MATH'

export const MathTableReader: TableReader<MathTable> = {
  tag: MathTag,
  read: readMathTable,
}

export const MathTableWriter: TableWriter<MathTable> = {
  tag: MathTag,
  write: writeMathTable,
}
