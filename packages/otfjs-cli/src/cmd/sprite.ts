import fs from 'node:fs'
import path from 'node:path'

import { ElementType } from 'htmlparser2'

import { stripExt } from '../lib/cli.js'
import { type Element, parseSvg, stringifySvg } from '../lib/svg.js'

export function run(args: string[]) {
  const [dir, outDir, complexPath] = args
  const previewFile = path.join(outDir, 'preview.svg')
  const files = fs.readdirSync(dir)
  const complexIds: string[] = []

  fs.mkdirSync(outDir, { recursive: true })
  fs.mkdirSync(path.dirname(complexPath), { recursive: true })

  const stream = fs.createWriteStream(previewFile)
  stream.write('<svg xmlns="http://www.w3.org/2000/svg">\n')

  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file), 'utf-8')
    const svg = parseSvg(data)[0] as Element | null

    if (!svg) {
      console.error('Invalid SVG:', file)
      continue
    }

    const fileId = fileToId(file)

    // If an SVG has any defs, we need to keep it as a separate file
    // because symbols can't reference internal ids.
    {
      const defs = svg.children.find(
        (child) => child.type === ElementType.Tag && child.name === 'defs',
      )

      if (defs) {
        fs.writeFileSync(path.join(outDir, `${fileId}.svg`), data)
        complexIds.push(fileId)
        continue
      }
    }

    const viewBox = svg.attribs.viewBox

    svg.attribs = { id: fileId, viewBox }
    svg.name = 'symbol'

    stream.write(stringifySvg([svg]))
    stream.write('\n')
  }

  stream.end('</svg>\n')

  fs.writeFileSync(complexPath, JSON.stringify(complexIds))
}

function fileToId(file: string) {
  return stripExt(file).toLowerCase().replaceAll(' ', '-')
}
