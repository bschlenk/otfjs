// https://learn.microsoft.com/en-us/typography/opentype/spec/prep

import type { TableReader } from '../table-reader.js'
import { readTableAsU8Array } from './common.js'

export type PrepTable = Uint8Array

export const PrepTag = 'prep'

export const PrepTableReader: TableReader<PrepTable> = {
  tag: PrepTag,
  read: readTableAsU8Array,
}
