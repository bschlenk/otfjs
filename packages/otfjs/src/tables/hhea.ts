import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { type HheaTable, readHheaTable, writeHheaTable } from './hhea.gen.js'

export { type HheaTable, readHheaTable, writeHheaTable } from './hhea.gen.js'

export const HheaTag = 'hhea'

export const HheaTableReader: TableReader<HheaTable> = {
  tag: HheaTag,
  read: readHheaTable,
}

export const HheaTableWriter: TableWriter<HheaTable> = {
  tag: HheaTag,
  write: writeHheaTable,
}
