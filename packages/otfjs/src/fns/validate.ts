import type { FontHandle } from '../font-handle.js'
import { validateHeader, validateTable } from '../validation.js'

export function validate(font: FontHandle): void {
  validateHeader(font.header)
  for (const table of font.header.tables) {
    validateTable(font.data, table)
  }
}
