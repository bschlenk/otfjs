/**
 * Serializes a single parsed table back into bytes.
 */
export interface TableWriter<T> {
  readonly tag: string
  write: (data: T) => Uint8Array
}
