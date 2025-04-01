import fs from 'node:fs'
import path from 'node:path'

import { Element, parse, stringify } from 'himalaya'

import { stripExt } from '../lib/cli.js'

export function run(args: string[]) {
  const dir = args[0]
  const files = fs.readdirSync(dir)

  const root: Element = {
    type: 'element',
    tagName: 'svg',
    attributes: [{ key: 'xmlns', value: 'http://www.w3.org/2000/svg' }],
    children: [],
  }

  for (const file of files) {
    const data = fs.readFileSync(path.join(dir, file), 'utf-8')
    const svg = parse(data)[0] as Element

    if (!svg) {
      console.error('Invalid SVG:', file)
      continue
    }

    const viewBox = svg.attributes.find((attr) => attr.key === 'viewBox')!

    root.children.push({
      type: 'element',
      tagName: 'symbol',
      attributes: [{ key: 'id', value: fileToId(file) }, viewBox],
      children: svg.children,
    })
  }

  console.log(stringify([root]))
}

function fileToId(file: string) {
  return stripExt(file).toLowerCase().replaceAll(' ', '-')
}
