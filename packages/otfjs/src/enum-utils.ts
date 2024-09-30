/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

import { SfntVersion } from './enums.js'

export function asSfntVersion(val: number): SfntVersion {
  switch (val) {
    case SfntVersion.TRUE_TYPE:
    case SfntVersion.OPEN_TYPE:
    case SfntVersion.APPLE_TRUE_TYPE:
    case SfntVersion.POST_SCRIPT:
      return val as SfntVersion
    default:
      throw new Error(`Unknown sfnt version: ${val.toString(16)}`)
  }
}
