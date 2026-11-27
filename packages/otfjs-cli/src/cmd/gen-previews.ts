import fs from 'fs/promises'
import path from 'path'

import {
  Font,
  getGlyphIndex,
  getSampleText,
  Glyph,
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
        console.warn(`no sample text to preview for ${file}`)
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

/**
 * An SVG of the font's sample text (see `getSampleText`), like "Aa" for a
 * Latin font, or null if the font has no sample to show.
 */
function generatePreview(font: Font): string | null {
  const text = getSampleText(font)
  if (!text) return null

  let glyphs: Glyph[]
  try {
    glyphs = [...text].map((char) =>
      font.getGlyph(getGlyphIndex(font, char.codePointAt(0)!)),
    )
  } catch {
    // font doesn't have glyf table (cff or cff2 instead?)
    // just return an empty svg for now
    return `<svg viewBox="0 0 100 100" height="100" width="100" fill="black" xmlns="http://www.w3.org/2000/svg"></svg>`
  }

  const upem = font.unitsPerEm

  // Lay the glyphs out left to right by advance width. The box starts from
  // the em box (baseline to unitsPerEm) so most fonts render at a consistent
  // scale, then grows to fit any ink that reaches outside it, like deep
  // descenders, tall ascenders, or swashes past the side bearings.
  let x = 0
  let xMin = Infinity
  let xMax = -Infinity
  let yMin = 0
  let yMax = upem
  const defs: Node[] = []
  const placed: { x: number; paths: Node[] }[] = []

  for (const glyph of glyphs) {
    const svg = glyphToColorSvg(glyph, font, 0)
    defs.push(...svg.defs)
    placed.push({ x, paths: svg.paths })

    const bounds = inkBounds(glyph, upem)
    xMin = Math.min(xMin, x + bounds.xMin)
    xMax = Math.max(xMax, x + bounds.xMax)
    yMin = Math.min(yMin, bounds.yMin)
    yMax = Math.max(yMax, bounds.yMax)
    x += glyph.advanceWidth
  }

  // Glyphs are drawn flipped (font y-up to svg y-down), so font yMax maps to
  // svg y = upem - yMax.
  const padding = (PADDING / 100) * upem
  const viewBox = `${xMin - padding} ${upem - yMax - padding} ${xMax - xMin + padding * 2} ${yMax - yMin + padding * 2}`

  const body = placed
    .map(({ x, paths }) => {
      const svg = nodesToSvg(paths)
      return x === 0 ? svg : `<g transform="translate(${x} 0)">${svg}</g>`
    })
    .join('\n    ')

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
    ${body}
  </g>
</svg>
`
}

/**
 * The glyph's outline bounds. Color glyphs often have an empty outline and
 * paint everything through COLR, so those use the advance and em height
 * instead, the same box glyphToColorSvg fills unclipped paints with.
 */
function inkBounds(glyph: Glyph, upem: number) {
  const empty = glyph.xMax <= glyph.xMin && glyph.yMax <= glyph.yMin
  if (!empty) return glyph
  return { xMin: 0, xMax: glyph.advanceWidth, yMin: 0, yMax: upem }
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
