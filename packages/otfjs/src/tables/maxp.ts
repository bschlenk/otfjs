import { readerFor } from '../table-reader.js'
import { writerFor } from '../table-writer.js'
import {
  type MaxpTable as MaxpTableType,
  readMaxpTable,
  writeMaxpTable,
} from './maxp.gen.js'

export {
  type MaxpTable05,
  type MaxpTable10,
  readMaxpTable,
  writeMaxpTable,
} from './maxp.gen.js'

export type MaxpTable = MaxpTableType

export const MaxpTag = 'maxp'

export const MaxpTableReader = readerFor<MaxpTable>(MaxpTag, readMaxpTable)

export const MaxpTableWriter = writerFor<MaxpTable>(MaxpTag, writeMaxpTable)

export const MaxpTable = { ...MaxpTableReader, ...MaxpTableWriter }
