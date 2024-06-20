import fs from 'fs/promises'
import path from 'path'

import { Font } from '../font.js'
import { glyphToSvgPath } from '../svg.js'

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

    fs.writeFile(outPath, preview)
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

  const g1 = font.getGlyph(glyphId1)
  const g2 = font.getGlyph(glyphId2)

  const g1d = glyphToSvgPath(g1)
  const g2d = glyphToSvgPath(g2)

  console.log(g1)

  const min = g1.xMin
  const max = min + g1.advanceWidth + g2.xMax

  return `\
<svg viewBox="${min} 0 ${max - min} ${upem}" height="100" xmlns="http://www.w3.org/2000/svg">
  <g transform="matrix(1 0 0 -1 0 ${upem})" fill="black">
    <path d="${g1d}" />
    <path d="${g2d}" transform="translate(${g1.advanceWidth} 0)" />
  </g>
</svg>
`
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
