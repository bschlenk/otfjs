import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { type MaxpTable, readMaxpTable, writeMaxpTable } from './maxp.gen.js'

export {
  type MaxpTable,
  type MaxpTable05,
  type MaxpTable10,
  readMaxpTable,
  writeMaxpTable,
} from './maxp.gen.js'

export const MaxpTag = 'maxp'

export const MaxpTableReader: TableReader<MaxpTable> = {
  tag: MaxpTag,
  read: readMaxpTable,
}

export const MaxpTableWriter: TableWriter<MaxpTable> = {
  tag: MaxpTag,
  write: writeMaxpTable,
}
