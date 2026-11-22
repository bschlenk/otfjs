// https://learn.microsoft.com/en-us/typography/opentype/spec/cvt

import { readerFor } from '../table-reader.js'
import { readTableAsI16Array } from './common.js'

export type CvtTable = number[]

export const CvtTag = 'cvt '

export const CvtTableReader = /* @__PURE__ */ readerFor<CvtTable>(
  CvtTag,
  readTableAsI16Array,
)
