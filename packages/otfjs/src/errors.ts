/** Thrown when data passed to `Font` doesn't start with a known font signature. */
export class NotAFontError extends Error {
  constructor() {
    super('Data is not a font file')
    this.name = 'NotAFontError'
  }
}
