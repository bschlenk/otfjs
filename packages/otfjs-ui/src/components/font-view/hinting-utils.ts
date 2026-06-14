import { Font, GlyphSimple, VirtualMachine } from 'otfjs'

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
 * Glyph points are pre-scaled to pixel space so instructions operate
 * on actual pixel coordinates.
 * Returns the hinted glyph and any error message.
 */
export function runHintingVM(
  font: Font,
  glyph: GlyphSimple,
  fontSize: number,
  upem: number,
): HintingResult {
  const scale = fontSize / upem
  const scaledGlyph = scaleGlyph(glyph, scale)

  try {
    const vm = new VirtualMachine(font)
    vm.setFontSize(fontSize)
    vm.cvt = vm.cvt.map((v) => v * scale)
    vm.runFpgm()
    vm.runPrep()
    vm.setGlyph(scaledGlyph)
    vm.runGlyph()
    return { glyph: vm.getGlyph(), error: null }
  } catch (e) {
    return { glyph: scaledGlyph, error: String(e) }
  }
}
