import fs from 'fs/promises'
import { Font, GlyphEnriched, glyphToColorSvg, type Node } from 'otfjs'
import path from 'path'
// @ts-expect-error types are bad
import { optimize } from 'svgo'

const args = process.argv.slice(2)
if (args.length < 1) {
  console.error('usage: gen-previews -d <out-dir> font-file.ttf+')
  process.exit(1)
}

const outDir = eat('-d', '.')

processFonts(args, outDir)

async function processFonts(fontFiles: string[], outDir: string) {
  for await (const { file, name } of iterFiles(fontFiles)) {
    console.log(name)
    const font = new Font(file.buffer)
    const preview = generatePreview(font)

    if (!preview) {
      console.warn(`failed to generate preview for ${name}`)
      continue
    }

    const nakedName = path.basename(name, path.extname(name))
    const outPath = path.join(outDir, `${nakedName}.svg`)

    const optimized = optimize(preview, { path: outPath, multipass: true })

    fs.writeFile(outPath, optimized.data)
  }
}

/** returns an svg string */
function generatePreview(font: Font): string | null {
  const upem = font.unitsPerEm
  const cmap = font.getTable('cmap')

  const glyphId1 = cmap.getGlyphIndex(0, 3, 'A'.codePointAt(0)!)
  const glyphId2 = cmap.getGlyphIndex(0, 3, 'a'.codePointAt(0)!)

  if (glyphId1 == null || glyphId2 == null) return null

  console.log('got glyph ids', glyphId1, glyphId2)

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
      for (const child of node.children) walk(child)
      out += `</${node.type}>`
    } else {
      out += '/>'
    }
  }

  for (const node of nodes) walk(node)

  return out
}

async function* iterFiles(files: string[]) {
  for (const name of files) {
    const file = await fs.readFile(name)
    yield { file, name }
  }
}

function eat(opt: string, orElse: string): string {
  let positionalArgCount = 0

  for (let i = 0; i < opt.length; ++i) {
    if (args[i] === opt) {
      return args.splice(i, 2)[1]
    }

    if (args[i].startsWith('-')) {
      positionalArgCount = 0
    } else if (++positionalArgCount == 2) {
      break
    }
  }

  return orElse
}
