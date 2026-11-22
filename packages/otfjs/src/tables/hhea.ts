import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
import { writerFor } from '../table-writer.js'
import {
  type HheaTable as HheaTableType,
  readHheaTable,
  writeHheaTable,
} from './hhea.gen.js'

export { readHheaTable, writeHheaTable } from './hhea.gen.js'

export type HheaTable = HheaTableType

export const HheaTag = 'hhea'

export const HheaTableReader = /* @__PURE__ */ readerFor<HheaTable>(
  HheaTag,
  readHheaTable,
)

export const HheaTableWriter = /* @__PURE__ */ writerFor<HheaTable>(
  HheaTag,
  writeHheaTable,
)

export const HheaTable = /* @__PURE__ */ tableFor(
  HheaTableReader,
  HheaTableWriter,
)
