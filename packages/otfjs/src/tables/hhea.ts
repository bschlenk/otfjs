import { readerFor } from '../table-reader.js'
import { writerFor } from '../table-writer.js'
import {
  type HheaTable as HheaTableType,
  readHheaTable,
  writeHheaTable,
} from './hhea.gen.js'

export { readHheaTable, writeHheaTable } from './hhea.gen.js'

export type HheaTable = HheaTableType

export const HheaTag = 'hhea'

export const HheaTableReader = readerFor<HheaTable>(HheaTag, readHheaTable)

export const HheaTableWriter = writerFor<HheaTable>(HheaTag, writeHheaTable)

export const HheaTable = { ...HheaTableReader, ...HheaTableWriter }
