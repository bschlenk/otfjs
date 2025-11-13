import fs from 'fs/promises'

import { decodeWoff2 } from 'otfjs/woff2'

import { changeExt, usage } from '../lib/cli.js'

export async function run(args: string[]) {
  if (args.length < 1) {
    usage('<file>')
    return 1
  }

  const name = args[0]
  const data = await fs.readFile(name)
  const woff2 = decodeWoff2(new Uint8Array(data.buffer))

  const outPath = changeExt(name, '.ttf')
  await fs.writeFile(outPath, woff2)
}
