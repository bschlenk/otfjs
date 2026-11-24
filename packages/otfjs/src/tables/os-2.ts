import type { TableReader } from '../table-reader.js'
import type { TableWriter } from '../table-writer.js'
import { type OS2Table, readOS2Table, writeOS2Table } from './os-2.gen.js'

export {
  type OS2Table,
  type OS2TableV0,
  type OS2TableV1,
  type OS2TableV2,
  type OS2TableV5,
  readOS2Table,
  writeOS2Table,
} from './os-2.gen.js'

export const OS2Tag = 'OS/2'

export const OS2TableReader: TableReader<OS2Table> = {
  tag: OS2Tag,
  read: readOS2Table,
}

export const OS2TableWriter: TableWriter<OS2Table> = {
  tag: OS2Tag,
  write: writeOS2Table,
}
