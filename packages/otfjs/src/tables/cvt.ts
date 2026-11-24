// https://learn.microsoft.com/en-us/typography/opentype/spec/cvt

import type { TableReader } from '../table-reader.js'
import { readTableAsI16Array } from '../utils/table-data.js'

export type CvtTable = number[]

export const CvtTag = 'cvt '

export const CvtTableReader: TableReader<CvtTable> = {
  tag: CvtTag,
  read: readTableAsI16Array,
}
