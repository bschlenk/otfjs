import fs from 'fs/promises'
import path from 'path'

import { usage } from '../lib/cli.js'
import { loadFont } from '../lib/utils.js'

const args = process.argv.slice(2)
if (args.length < 1) {
  usage('<font-dir> [table]')
  process.exit(1)
}

const fontDir = args[0]
const fnames = await fs.readdir(fontDir)

if (args.length === 2) {
  await findFontsWithTable(args[1])
} else {
  await countTables()
}

async function countTables() {
  const tables = new Map<string, number>()

  for (const fname of fnames) {
    const font = await loadFont(path.join(fontDir, fname))
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
}

async function findFontsWithTable(table: string) {
  for (const fname of fnames) {
    const font = await loadFont(path.join(fontDir, fname))
    if (font.hasTable(table)) {
      console.log(fname)
    }
  }
}
