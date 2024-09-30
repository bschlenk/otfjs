import fs from 'fs/promises'
import { Font, GlyphEnriched, glyphToColorSvg, type Node } from 'otfjs'
import path from 'path'
import { optimize } from 'svgo'

import { eat } from '../lib/cli.js'
import { loadFont } from '../lib/utils.js'

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: gen-previews -d <out-dir> font-file.ttf+')
  process.exit(1)
}

const outDir = eat(args, '-d', '.')

processFonts(args, outDir).catch((err) => {
  console.error(err)
  process.exit(1)
})

async function processFonts(fontFiles: string[], outDir: string) {
  for await (const { font, name } of iterFonts(fontFiles)) {
    console.log(name)
    const preview = generatePreview(font)

    if (!preview) {
      console.warn(`failed to generate preview for ${name}`)
      continue
    }

    const nakedName = path.basename(name, path.extname(name))
    const outPath = path.join(outDir, `${nakedName}.svg`)

    const optimized = optimize(preview, { path: outPath, multipass: true })

    void fs.writeFile(outPath, optimized.data)
  }
}

/** returns an svg string */
function generatePreview(font: Font): string | null {
  const upem = font.unitsPerEm
  const cmap = font.getTable('cmap')

  const glyphId1 = cmap.getGlyphIndex('A'.codePointAt(0)!)
  const glyphId2 = cmap.getGlyphIndex('a'.codePointAt(0)!)

  if (glyphId1 == null || glyphId2 == null) return null

  let g1!: GlyphEnriched, g2!: GlyphEnriched

  try {
    g1 = font.getGlyph(glyphId1)
    g2 = font.getGlyph(glyphId2)
  } catch {
    // font doesn't have glyf table (cff or cff2 instead?)
    // just return an empty svg for now
    return `<svg viewBox="0 0 100 100" height="100" width="100" fill="black" xmlns="http://www.w3.org/2000/svg"></svg>`
  }

  const g1s = glyphToColorSvg(g1, font, 0)
  const g2s = glyphToColorSvg(g2, font, 0)

  const min = g1.xMin
  const max = min + g1.advanceWidth + g2.xMax

  const defs = [...g1s.defs, ...g2s.defs]

  return `\
<svg viewBox="${min} 0 ${max - min} ${upem}" height="100" fill="black" xmlns="http://www.w3.org/2000/svg">
${
  defs.length > 0 ?
    `\
  <defs>
    ${nodesToSvg(defs)}
  </defs>
`
  : ''
}\
  <g transform="matrix(1 0 0 -1 0 ${upem})">
    ${nodesToSvg(g1s.paths)}
    <g transform="translate(${g1.advanceWidth} 0)">
      ${nodesToSvg(g2s.paths)}
    </g>
  </g>
</svg>
`
}

function nodesToSvg(nodes: Node[]) {
  let out = ''

  function walk(node: Node) {
    const attrs = []
    for (const [k, v] of Object.entries(node.props)) {
      if (v != null) attrs.push(`${k}="${v}"`)
    }

    out += `<${node.type} ${attrs.join(' ')}`

    if (node.children.length) {
      out += '>'
      node.children.forEach(walk)
      out += `</${node.type}>`
    } else {
      out += '/>'
    }
  }

  nodes.forEach(walk)

  return out
}

async function* iterFonts(files: string[]) {
  for (const name of files) {
    const font = await loadFont(name)
    yield { font, name }
  }
}
