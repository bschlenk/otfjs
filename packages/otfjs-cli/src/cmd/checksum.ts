import fs from 'fs/promises'
import { computeChecksum } from 'otfjs'

import { usage } from '../lib/cli.js'

const args = process.argv.slice(2)
if (args.length < 1) {
  usage('<file>')
  process.exit(1)
}

const name = args[0]
const data = await fs.readFile(name)

const checksum = computeChecksum(new Uint8Array(data.buffer))
console.log(checksum)
