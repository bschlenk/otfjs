// https://learn.microsoft.com/en-us/typography/opentype/spec/prep

import { readerFor } from '../table-reader.js'
import { readTableAsU8Array } from './common.js'

export type PrepTable = Uint8Array

export const PrepTag = 'prep'

export const PrepTableReader = readerFor<PrepTable>(PrepTag, readTableAsU8Array)
