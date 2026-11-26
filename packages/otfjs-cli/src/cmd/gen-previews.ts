import fs from 'fs/promises'
import path from 'path'

import {
  Font,
  getGlyphIndex,
  GlyphEnriched,
  glyphToColorSvg,
  type Node,
} from 'otfjs'
import { optimize } from 'svgo'

import { eat } from '../lib/cli.js'
import { iterFonts } from '../lib/utils.js'

// TODO: take this as a cli arg, but for now this is how much padding we
// want to add around the viewBox
const PADDING = 16

export async function run(args: string[]) {
  if (args.length < 1) {
    console.error('usage: gen-previews -d <out-dir> font-file.ttf+')
    return 1
  }

  const outDir = eat(args, '-d', '.')
  await fs.mkdir(outDir, { recursive: true })

  return processFonts(args, outDir)
}

async function processFonts(fontFiles: string[], outDir: string) {
  for await (const { font, file } of iterFonts(fontFiles)) {
    try {
      console.log(file)

      const preview = generatePreview(font)
      if (!preview) {
        console.warn(`failed to generate preview for ${file}`)
        continue
      }

      const name = path.basename(file, path.extname(file))
      const outPath = path.join(outDir, `${name}.svg`)

      const optimized = optimize(preview, {
        path: outPath,
        multipass: true,
        plugins: [
          'preset-default',
          {
            name: 'prefixIds',
            params: {
              prefix: name.toLowerCase().replaceAll(' ', '-'),
              delim: '-',
            },
          },
        ],
      })
      await fs.writeFile(outPath, optimized.data)
    } catch (err) {
      console.error(`failed to generate preview for ${file}:`, err)
    }
  }
}

/** returns an svg string */
function generatePreview(font: Font): string | null {
  const upem = font.unitsPerEm
  const glyphId1 = getGlyphIndex(font, 'A'.codePointAt(0)!)
  const glyphId2 = getGlyphIndex(font, 'a'.codePointAt(0)!)

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

  // Start from the em box (baseline to unitsPerEm) so most fonts render at a
  // consistent scale, then grow it to fit any ink that reaches outside it,
  // like deep descenders, tall ascenders, or swashes past the side bearings.
  const advance = g1.advanceWidth
  const xMin = Math.min(g1.xMin, advance + g2.xMin)
  const xMax = Math.max(g1.xMax, advance + g2.xMax)
  const yMin = Math.min(0, g1.yMin, g2.yMin)
  const yMax = Math.max(upem, g1.yMax, g2.yMax)

  const defs = [...g1s.defs, ...g2s.defs]

  // Glyphs are drawn flipped (font y-up to svg y-down), so font yMax maps to
  // svg y = upem - yMax.
  const padding = (PADDING / 100) * upem
  const viewBox = `${xMin - padding} ${upem - yMax - padding} ${xMax - xMin + padding * 2} ${yMax - yMin + padding * 2}`

  return `\
<svg viewBox="${viewBox}" height="100" fill="black" xmlns="http://www.w3.org/2000/svg">
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
    const props = Object.entries(node.props) as [string, AttrValue][]
    for (const [k, v] of props) {
      if (v == null) continue
      attrs.push(`${k}="${typeof v === 'object' ? styleToCss(v) : v}"`)
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

/** An SVG node prop: an attribute value, or a `style` object. */
type AttrValue = string | number | Record<string, string> | null | undefined

/** `{ mixBlendMode: 'screen' }` to `mix-blend-mode: screen`. */
function styleToCss(style: Record<string, string>) {
  return Object.entries(style)
    .map(
      ([name, value]) =>
        `${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}: ${value}`,
    )
    .join('; ')
}
