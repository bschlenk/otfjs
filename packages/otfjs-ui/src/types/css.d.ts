declare module 'csstype' {
  // We want to merge interfaces here, using a `Record` won't work
  // eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
  interface Properties {
    [index: `--${string}`]: any
  }
}
