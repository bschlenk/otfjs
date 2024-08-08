import fs from 'fs/promises'
import { decodeWoff2File } from 'otfjs'

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: woff2 <file>')
  process.exit(1)
}

const data = await fs.readFile(args[0])
const woff2 = decodeWoff2File(data.buffer)

console.log(woff2)
