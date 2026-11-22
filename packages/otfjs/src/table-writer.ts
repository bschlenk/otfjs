/**
 * Serializes a single parsed table back into bytes.
 */
export interface TableWriter<T> {
  readonly tag: string
  write(data: T): Uint8Array
}

export function writerFor<T>(
  tag: string,
  write: (data: T) => Uint8Array,
): TableWriter<T> {
  return { tag, write }
}
