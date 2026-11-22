import { readerFor } from '../table-reader.js'
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

export const HeadTableReader = readerFor<HeadTable>(HeadTag, readHeadTable)

export const HeadTableWriter = writerFor<HeadTable>(HeadTag, writeHeadTable)

export const HeadTable = { ...HeadTableReader, ...HeadTableWriter }
