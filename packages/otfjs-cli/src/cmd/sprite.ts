import fs from 'node:fs'
import path from 'node:path'

import { Element, parse, stringify } from 'himalaya'

import { stripExt } from '../lib/cli.js'

export function run(args: string[]) {
  const [dir, outDir, complexPath] = args
  const previewFile = path.join(outDir, 'preview.svg')
  const files = fs.readdirSync(dir)
  const complexIds: string[] = []

  const stream = fs.createWriteStream(previewFile)
  stream.write('<svg xmlns="http://www.w3.org/2000/svg">\n')

  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file), 'utf-8')
    const svg = parse(data)[0] as Element

    if (!svg) {
      console.error('Invalid SVG:', file)
      continue
    }

    const fileId = fileToId(file)

    // We merge all defs into a single defs element at the start of the svg sprite
    const defsIndex = svg.children.findIndex(
      (child) => child.type === 'element' && child.tagName === 'defs',
    )

    if (defsIndex !== -1) {
      fs.writeFileSync(path.join(outDir, `${fileId}.svg`), data)
      complexIds.push(fileId)
      continue
    }

    const viewBox = svg.attributes.find((attr) => attr.key === 'viewBox')!
    const id = { key: 'id', value: fileId }

    svg.attributes = [id, viewBox]
    svg.tagName = 'symbol'

    stream.write(stringify([svg]))
    stream.write('\n')
  }

  stream.end('</svg>\n')

  fs.writeFileSync(complexPath, JSON.stringify(complexIds))
}

function fileToId(file: string) {
  return stripExt(file).toLowerCase().replaceAll(' ', '-')
}
