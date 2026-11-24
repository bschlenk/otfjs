// Benchmarks the work the UI's glyf view does: decode every glyph in a
// font, then turn each one into SVG (COLR layers included).
//
//   pnpm bench                       # run
//   pnpm bench --outputJson base.json  # save a baseline
//   pnpm bench --compare base.json     # compare against it
//
// Fonts come from the gitignored fonts/ folder (see scripts/update-fonts.sh);
// missing ones are skipped. Each iteration opens a fresh `Font`, so table
// caches start cold, like opening a font in the UI.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { bench, describe } from 'vitest'

import { Font } from '../src/font.js'
import { glyphToColorSvg, glyphToSvgPath } from '../src/svg.js'

const FONTS_DIR = resolve(import.meta.dirname, '../../../fonts/google')

const FONTS = [
  'Noto Color Emoji.ttf',
  'Noto Sans JP.ttf',
  'Inter.ttf',
  'Roboto.ttf',
]

// Whole-font passes are slow, so run a fixed, small number of them rather
// than tinybench's default of as many as fit in 500ms.
const OPTIONS = { iterations: 5, time: 0, warmupIterations: 1, warmupTime: 0 }

for (const name of FONTS) {
  const path = resolve(FONTS_DIR, name)
  const exists = existsSync(path)
  const data = exists ? new Uint8Array(readFileSync(path)) : new Uint8Array()

  describe.skipIf(!exists)(name, () => {
    // A hash of the color-svg output, to check that optimizations don't
    // change it.
    if (exists) console.log(`${name} output: ${digest(new Font(data))}`)

    bench(
      'decode',
      () => {
        let points = 0
        for (const glyph of new Font(data).glyphs()) {
          points += glyph.points.length
        }
        return void points
      },
      OPTIONS,
    )

    bench(
      'path',
      () => {
        let length = 0
        for (const glyph of new Font(data).glyphs()) {
          length += glyphToSvgPath(glyph).length
        }
        return void length
      },
      OPTIONS,
    )

    bench.skipIf(!fontHasColr(data))(
      'colr',
      () => {
        const font = new Font(data)
        const colr = font.getTable('COLR')
        for (let i = 0; i < font.numGlyphs; ++i) colr.colorGlyph(i)
      },
      OPTIONS,
    )

    bench(
      'color-svg',
      () => {
        const font = new Font(data)
        for (const glyph of font.glyphs()) glyphToColorSvg(glyph, font, 0)
      },
      OPTIONS,
    )
  })
}

function fontHasColr(data: Uint8Array) {
  return data.length > 0 && new Font(data).hasTable('COLR')
}

function digest(font: Font) {
  const hash = createHash('sha256')
  for (const glyph of font.glyphs()) {
    hash.update(JSON.stringify(glyphToColorSvg(glyph, font, 0)))
  }
  return hash.digest('hex').slice(0, 16)
}
