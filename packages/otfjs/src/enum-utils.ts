/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */

import { SfntVersion } from './enums.js'

export function asSfntVersion(val: number): SfntVersion {
  if (isSfntVersion(val)) return val
  throw new Error(`Unknown sfnt version: ${val.toString(16)}`)
}

export function isSfntVersion(val: number): val is SfntVersion {
  switch (val) {
    case SfntVersion.TRUE_TYPE:
    case SfntVersion.OPEN_TYPE:
    case SfntVersion.APPLE_TRUE_TYPE:
    case SfntVersion.POST_SCRIPT:
      return true
    default:
      return false
  }
}
