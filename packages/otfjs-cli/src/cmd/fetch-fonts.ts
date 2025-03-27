import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { type ReadableStream as WebReadableStream } from 'stream/web'

import { readJsonSync } from '../lib/utils.js'

export const GOOGLE_FONT_DOMAIN = 'https://fonts.gstatic.com'

type FontInfo = Record<string, string>

export async function run(args: string[]) {
  if (args.length !== 2) {
    console.error('usage: fetch-fonts <fonts.json> <output-dir>')
    return 1
  }

  const fonts = readJsonSync<FontInfo>(args[0])
  const outDir = args[1]

  fs.mkdirSync(outDir, { recursive: true })

  for (const [font, urlPath] of Object.entries(fonts)) {
    const url = urlForFont(urlPath)
    const ext = path.extname(url)
    const fname = path.join(outDir, `${font}${ext}`)

    const res = await fetch(url)
    const stream = fs.createWriteStream(fname)

    Readable.fromWeb(res.body as WebReadableStream).pipe(stream)
  }
}

function urlForFont(pathname: string) {
  return new URL(pathname, GOOGLE_FONT_DOMAIN).toString()
}
