import fs from 'fs/promises'
import { PlatformId } from 'otfjs'
import path from 'path'

import { loadFont } from '../lib/utils.js'

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: analyze-cmap <font-dir>')
  process.exit(1)
}

const fontDir = args[0]
const fnames = await fs.readdir(fontDir)

await analyzeCmap()

async function analyzeCmap() {
  const platformEncodings = new Map<string, number>()

  for (const fname of fnames) {
    if (fname.startsWith('.')) continue

    try {
      const font = await loadFont(path.join(fontDir, fname))

      const cmap = font.getTable('cmap')
      for (const record of cmap.encodingRecords) {
        const key = `${record.platformId}-${record.encodingId}`
        const count = platformEncodings.get(key) ?? 0
        platformEncodings.set(key, count + 1)

        if (record.platformId === PlatformId.Macintosh) {
          console.log(fname, record.platformId, record.encodingId)
        }
      }
    } catch (e) {
      console.error('something went wrong processing', fname)
      throw e
    }
  }

  Array.from(platformEncodings.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([pe, count]) => {
      console.log(pe, count)
    })
}
