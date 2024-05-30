type Handler<U> = (flag: number) => U
type FlagConfig<T extends string> = Record<T, number | Handler<any>>

export function createFlagReader<T extends FlagConfig<any>>(
  cfg: T,
): (flags: number) => {
  [K in keyof T]: (typeof cfg)[K] extends number ? boolean
  : (typeof cfg)[K] extends (...args: any) => any ? ReturnType<(typeof cfg)[K]>
  : never
} & { value: number } {
  function Flags(this: { value: number }, value: number) {
    this.value = value
  }

  for (const [key, value] of Object.entries(cfg)) {
    if (typeof value === 'function') {
      Object.defineProperty(Flags.prototype, key, {
        get() {
          return value(this.value)
        },
      })
    } else {
      Object.defineProperty(Flags.prototype, key, {
        get() {
          return Boolean(this.value & (1 << (value as number)))
        },
        set(val: boolean) {
          const k = 1 << (value as number)
          if (val) {
            this.value |= k
          } else {
            this.value &= ~k
          }
        },
      })
    }
  }

  Flags.prototype.toJSON = function () {
    const obj: Record<string, any> = { value: this.value }
    for (const key of Object.keys(cfg)) {
      obj[key] = this[key]
    }
    return obj
  }

  return (flags: number) => new (Flags as any)(flags)
}
