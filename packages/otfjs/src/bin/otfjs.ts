import fs from 'fs/promises'

import { Font } from '../index.js'

const args = process.argv.slice(2)
if (!args[0]) {
  console.error('usage: otfjs <path-to-font>')
  process.exit(1)
}

const path = args[0]
const data = await fs.readFile(path)

const font = new Font(new Uint8Array(data.buffer))
console.log(font.tables)
