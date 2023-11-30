export function createFlagReader<T extends string>(
  cfg: Record<T, number>,
): (flags: number) => { [K in T]: boolean } {
  function Flags(this: { _flags: number }, flags: number) {
    this._flags = flags
  }

  for (const [key, value] of Object.entries(cfg)) {
    Object.defineProperty(Flags.prototype, key, {
      get() {
        return Boolean(this._flags & (1 << (value as number)))
      },
    })
  }

  return (flags: number) => new (Flags as any)(flags)
}
