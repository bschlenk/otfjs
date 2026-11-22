import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
import { writerFor } from '../table-writer.js'
import {
  type HeadTable as HeadTableType,
  readHeadTable,
  writeHeadTable,
} from './head.gen.js'

export {
  type HeadFlags,
  type MacStyle,
  readHeadTable,
  writeHeadTable,
} from './head.gen.js'

export type HeadTable = HeadTableType

export const HeadTag = 'head'

export const HeadTableReader = /* @__PURE__ */ readerFor<HeadTable>(
  HeadTag,
  readHeadTable,
)

export const HeadTableWriter = /* @__PURE__ */ writerFor<HeadTable>(
  HeadTag,
  writeHeadTable,
)

export const HeadTable = /* @__PURE__ */ tableFor(
  HeadTableReader,
  HeadTableWriter,
)
