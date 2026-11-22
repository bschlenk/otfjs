import { readerFor } from '../table-reader.js'
import { tableFor } from '../table-reader-writer.js'
import { writerFor } from '../table-writer.js'
import {
  type OS2Table as OS2TableType,
  readOS2Table,
  writeOS2Table,
} from './os-2.gen.js'

export {
  type OS2TableV0,
  type OS2TableV1,
  type OS2TableV2,
  type OS2TableV5,
  readOS2Table,
  writeOS2Table,
} from './os-2.gen.js'

export type OS2Table = OS2TableType

export const OS2Tag = 'OS/2'

export const OS2TableReader = /* @__PURE__ */ readerFor<OS2Table>(
  OS2Tag,
  readOS2Table,
)

export const OS2TableWriter = /* @__PURE__ */ writerFor<OS2Table>(
  OS2Tag,
  writeOS2Table,
)

export const OS2Table = /* @__PURE__ */ tableFor(OS2TableReader, OS2TableWriter)
