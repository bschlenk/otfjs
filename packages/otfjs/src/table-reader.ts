import type { Reader } from '@otfjs/buffer'

import type { FontHandle } from './font-handle.js'

/**
 * Parses a single table out of a font. Pass one to
 * `FontHandle.readTable` to read and cache that table.
 *
 * `read` receives a view over just this table's bytes, plus the font
 * handle so it can read any other tables it depends on.
 */
export interface TableReader<T> {
  readonly tag: string
  read: (view: Reader, font: FontHandle) => T
}

export function readerFor<T>(
  tag: string,
  read: (view: Reader, font: FontHandle) => T,
): TableReader<T> {
  return { tag, read }
}
