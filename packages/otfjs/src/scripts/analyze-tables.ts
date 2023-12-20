import fs from 'fs/promises'
import path from 'path'

import { Font } from '../font.js'

const args = process.argv.slice(2)
if (args.length !== 1) {
  console.error('usage: analyze-tables <font-dir>')
  process.exit(1)
}

const fontDir = args[0]
const fnames = await fs.readdir(fontDir)

const tables = new Map<string, number>()

for (const fname of fnames) {
  const data = await fs.readFile(path.join(fontDir, fname))
  const font = new Font(data.buffer)
  for (const table of font.tables) {
    const count = tables.get(table) || 0
    tables.set(table, count + 1)
  }
}

Array.from(tables.entries())
  .sort((a, b) => b[1] - a[1])
  .forEach(([table, count]) => {
    console.log(table, count)
  })
