import { load } from './parser.js'
import fs from 'fs/promises'

const args = process.argv.slice(2)
if (!args[0]) {
  console.error('usage: otfjs <path-to-font>')
  process.exit(1)
}

const path = args[0]
const data = await fs.readFile(path)

load(data.buffer)
