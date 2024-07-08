import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'

const args = process.argv.slice(2)
if (args.length !== 2) {
  console.error('usage: fetch-fonts <fonts.json> <output-dir>')
  process.exit(1)
}

const fonts = JSON.parse(fs.readFileSync(args[0], 'utf8'))
const outDir = args[1]

fs.mkdirSync(outDir, { recursive: true })

for (const font of fonts.items) {
  const url = font.menu
  const ext = path.extname(url)
  const fname = path.join(outDir, `${font.family}${ext}`)

  const res = await fetch(url)
  const stream = fs.createWriteStream(fname)

  Readable.fromWeb(res.body as any).pipe(stream)
}
