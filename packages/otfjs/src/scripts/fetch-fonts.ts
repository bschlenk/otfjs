import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { finished } from 'stream/promises'

const args = process.argv.slice(2)
if (args.length !== 1) {
  console.error('usage: fetch-fonts <output-dir>')
  process.exit(1)
}

const fonts = JSON.parse(fs.readFileSync('./fonts.json', 'utf8'))

const outDir = args[0]

const promises = []

for (const font of fonts.items) {
  if (!font.files.regular) continue

  const ext = path.extname(font.files.regular)
  const fname = path.join(outDir, `${font.family}${ext}`)

  const res = await fetch(font.files.regular)
  const stream = fs.createWriteStream(fname)

  promises.push(finished(Readable.fromWeb(res.body!).pipe(stream)))
}

await Promise.all(promises)
