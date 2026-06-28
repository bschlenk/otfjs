import { Font, GlyphEnriched, GlyphSimple, VirtualMachine } from 'otfjs'

export function scaleGlyph(glyph: GlyphSimple, scale: number): GlyphSimple {
  return {
    ...glyph,
    xMin: glyph.xMin * scale,
    yMin: glyph.yMin * scale,
    xMax: glyph.xMax * scale,
    yMax: glyph.yMax * scale,
    points: glyph.points.map((p) => ({ ...p, x: p.x * scale, y: p.y * scale })),
  }
}

export interface HintingResult {
  /** Hinted glyph — coordinates in pixel space (same as scaled input). */
  glyph: GlyphSimple
  error: string | null
}

/**
 * Runs the TrueType VM on `glyph` at `fontSize` pixels.
 * Glyph points are pre-scaled to pixel space. The CVT is left as raw font
 * units so that prep's fpgm functions receive the values they expect.
 */
export function runHintingVM(
  font: Font,
  glyph: GlyphSimple,
  fontSize: number,
  upem: number,
  phaseX = 0,
  phaseY = 0,
): HintingResult {
  const scale = fontSize / upem
  const scaledGlyph = scaleGlyph(glyph, scale)

  // Resolve advance width and left side bearing for phantom points.
  let awFU = 0
  let lsbFU = glyph.xMin
  try {
    const hmtx = font.getTable('hmtx')
    const glyphId = 'id' in glyph ? (glyph as GlyphEnriched).id : 0
    const record =
      hmtx.longHorMetrics[glyphId] ??
      hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]
    if (record) {
      awFU = record.advanceWidth
      lsbFU = record.leftSideBearing
    }
  } catch {
    // hmtx unavailable — phantom points default to zeros
  }

  try {
    const vm = new VirtualMachine(font)
    vm.setFontSize(fontSize)
    vm.runFpgm()
    console.log('[hint] cvt[0..19] after fpgm:', vm.cvt.slice(0,20).map((v,i)=>`${i}:${(v??0).toFixed(0)}`).join(' '))
    vm.runPrep()
    console.log('[hint] cvt[0..19] after prep:', vm.cvt.slice(0,20).map((v,i)=>`${i}:${(v??0).toFixed(2)}`).join(' '))
    vm.setGlyph(scaledGlyph, awFU * scale, lsbFU * scale, phaseX, phaseY)
    vm.runGlyph()
    const hinted = vm.getGlyph()
    const n = hinted.points.length
    console.log(
      `[hint] hinted ${n} pts, sample y values:`,
      hinted.points.map((p, i) => `[${i}]${p.y.toFixed(2)}`).filter((_, i) => i < 5 || i > n - 4).join(' '),
    )
    return { glyph: hinted, error: null }
  } catch (e) {
    return { glyph: scaledGlyph, error: String(e) }
  }
}
