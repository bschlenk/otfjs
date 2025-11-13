import fs from 'fs/promises'

import { computeChecksum } from 'otfjs'

import { usage } from '../lib/cli.js'

export async function run(args: string[]) {
  if (args.length < 1) {
    usage('<file>')
    return 1
  }

  const name = args[0]
  const data = await fs.readFile(name)

  const checksum = computeChecksum(new Uint8Array(data.buffer))
  console.log(checksum)
}
