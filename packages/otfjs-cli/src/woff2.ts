import fs from 'fs/promises'
import { decodeWoff2 } from 'otfjs/woff2'
import path from 'path'

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: woff2 <file>')
  process.exit(1)
}

const name = args[0]
const data = await fs.readFile(name)
const woff2 = decodeWoff2(data.buffer)

const dirname = path.dirname(name)
const nakedName = path.basename(name, path.extname(name))
const outPath = path.join(dirname, `${nakedName}.ttf`)

fs.writeFile(outPath, woff2)
