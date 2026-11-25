import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import {
  type HeadTable,
  type HeadTableInit,
  readHeadTable,
  writeHeadTable,
} from './head.gen.js'

export {
  type HeadFlags,
  type HeadTable,
  type HeadTableInit,
  type MacStyle,
  readHeadTable,
  writeHeadTable,
} from './head.gen.js'

export const HeadTag = 'head'

export const HeadTableReader: TableReader<HeadTable> = {
  tag: HeadTag,
  read: readHeadTable,
}

export const HeadTableWriter: TableWriter<HeadTableInit> = {
  tag: HeadTag,
  write: writeHeadTable,
}
