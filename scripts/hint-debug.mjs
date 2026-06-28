#!/usr/bin/env node
// Run the TrueType hinting VM on a glyph and print debug logs.
// Usage: node scripts/hint-debug.mjs <font.ttf> <glyphIndex> <fontSize>
// Example: node scripts/hint-debug.mjs fonts/google/Roboto.ttf 39 16

import { readFileSync } from 'fs'
import { Font, VirtualMachine } from '../packages/otfjs/dist/index.js'

const [, , fontPath = 'fonts/google/Roboto.ttf', glyphIndexStr = '39', fontSizeStr = '16'] = process.argv
const glyphIndex = parseInt(glyphIndexStr, 10)
const fontSize = parseInt(fontSizeStr, 10)

const data = new Uint8Array(readFileSync(fontPath))
const font = new Font(data)

const upem = font.getTable('head').unitsPerEm
const scale = fontSize / upem

// Get glyph
const glyph = font.getGlyph(glyphIndex)
if (!('points' in glyph)) {
  console.error('Composite glyph — no points to hint')
  process.exit(1)
}

// Scale glyph to pixel space
const scaledGlyph = {
  ...glyph,
  xMin: glyph.xMin * scale,
  yMin: glyph.yMin * scale,
  xMax: glyph.xMax * scale,
  yMax: glyph.yMax * scale,
  points: glyph.points.map(p => ({ ...p, x: p.x * scale, y: p.y * scale })),
}

// Resolve phantom points from hmtx
let awFU = 0
let lsbFU = glyph.xMin
try {
  const hmtx = font.getTable('hmtx')
  const record = hmtx.longHorMetrics[glyphIndex] ?? hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]
  if (record) { awFU = record.advanceWidth; lsbFU = record.leftSideBearing }
} catch {}

const vm = new VirtualMachine(font)
vm.setFontSize(fontSize)
vm._tracePrep = true

console.log(`[hint] font=${fontPath} glyph=${glyphIndex} fontSize=${fontSize} upem=${upem}`)

try {
  vm.runFpgm()
  console.log('[hint] cvt[0..19] after fpgm:', vm.cvt.slice(0, 20).map((v, i) => `${i}:${(v ?? 0).toFixed(0)}`).join(' '))

  vm.runPrep()
  console.log('[hint] cvt[0..19] after prep:', vm.cvt.slice(0, 20).map((v, i) => `${i}:${(v ?? 0).toFixed(2)}`).join(' '))

  vm.setGlyph(scaledGlyph, awFU * scale, lsbFU * scale)
  vm._tracePrep = false
  vm._traceGlyph = true
  vm.runGlyph()

  const hinted = vm.getGlyph()
  const n = hinted.points.length
  console.log(`[hint] hinted ${n} pts:`, hinted.points.map((p, i) => `[${i}](${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(' '))
} catch (e) {
  console.error('[hint] ERROR:', e.message)
  process.exit(1)
}
