import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
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

export const MaxpTableReader = /* @__PURE__ */ readerFor<MaxpTable>(
  MaxpTag,
  readMaxpTable,
)

export const MaxpTableWriter = /* @__PURE__ */ writerFor<MaxpTable>(
  MaxpTag,
  writeMaxpTable,
)

export const MaxpTable = /* @__PURE__ */ tableFor(
  MaxpTableReader,
  MaxpTableWriter,
)
