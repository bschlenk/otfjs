import type { TableReader } from './table-reader.js'
import type { TableWriter } from './table-writer.js'

/**
 * A table's reader and writer combined into one object, for consumers
 * who need both and don't care about tree-shaking one of them away.
 *
 * Use `tableFor` rather than a `{ ...reader, ...writer }` literal:
 * bundlers can't drop an unused spread (it may run getters), so the
 * literal would keep the writer alive for consumers that only import
 * the reader.
 */
export interface TableReaderWriter<T> extends TableReader<T>, TableWriter<T> {}

// Rollup honors this annotation across modules. esbuild only honors it
// within the defining module, so module-scope calls should also be
// annotated with /* @__PURE__ */ to be dropped when unused.
/* @__NO_SIDE_EFFECTS__ */
export function tableFor<T>(
  reader: TableReader<T>,
  writer: TableWriter<T>,
): TableReaderWriter<T> {
  return { ...reader, ...writer }
}
