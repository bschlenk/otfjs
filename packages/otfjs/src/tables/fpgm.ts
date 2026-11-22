// https://learn.microsoft.com/en-us/typography/opentype/spec/fpgm

import { readerFor } from '../table-reader.js'
import { readTableAsU8Array } from './common.js'

export type FpgmTable = Uint8Array

export const FpgmTag = 'fpgm'

export const FpgmTableReader = readerFor<FpgmTable>(FpgmTag, readTableAsU8Array)
