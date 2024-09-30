import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { type ReadableStream as WebReadableStream } from 'stream/web'

import { readJsonSync } from '../lib/utils.js'

interface FontInfo {
  items: { family: string; menu: string }[]
}

const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error('usage: fetch-fonts <fonts.json> <output-dir>')
  process.exit(1)
}

const fonts = readJsonSync<FontInfo>(args[0])
const outDir = args[1]

fs.mkdirSync(outDir, { recursive: true })

for (const font of fonts.items) {
  const url = font.menu
  const ext = path.extname(url)
  const fname = path.join(outDir, `${font.family}${ext}`)

  const res = await fetch(url)
  const stream = fs.createWriteStream(fname)

  Readable.fromWeb(res.body as WebReadableStream).pipe(stream)
}
