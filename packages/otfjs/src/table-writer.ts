/**
 * Serializes a single parsed table back into bytes.
 */
export interface TableWriter<T> {
  readonly tag: string
  write: (data: T) => Uint8Array
}

// Rollup honors this annotation across modules. esbuild only honors it
// within the defining module, so module-scope calls should also be
// annotated with /* @__PURE__ */ to be dropped when unused.
/* @__NO_SIDE_EFFECTS__ */
export function writerFor<T>(
  tag: string,
  write: (data: T) => Uint8Array,
): TableWriter<T> {
  return { tag, write }
}
