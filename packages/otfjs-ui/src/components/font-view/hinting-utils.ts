import { Font, GlyphEnriched, GlyphSimple, renderGlyphToCanvas,VirtualMachine } from 'otfjs'

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
    // hmtx unavailable
  }

  try {
    const vm = new VirtualMachine(font)
    vm.setFontSize(fontSize)
    vm.runFpgm()
    vm.runPrep()
    vm.setGlyph(scaledGlyph, awFU * scale, lsbFU * scale, phaseX, phaseY)
    vm.runGlyph()
    return { glyph: vm.getGlyph(), error: null }
  } catch (e) {
    return { glyph: scaledGlyph, error: String(e) }
  }
}

/**
 * Renders a glyph to an offscreen canvas at the given scale.
 * The canvas uses a Y-flipped coordinate system matching the font's convention.
 * Returns null if the glyph has no points.
 */
export function renderGlyphToOffscreen(
  glyph: GlyphSimple,
  scale: number,
  antiAlias = false,
  subPixelX = 0,
  subPixelY = 0,
): HTMLCanvasElement | null {
  if (!glyph.points.length) return null

  // +4 instead of +2 to give headroom for the [0,1) sub-pixel shift
  const w = Math.max(1, Math.ceil((glyph.xMax - glyph.xMin) * scale) + 4)
  const h = Math.max(1, Math.ceil((glyph.yMax - glyph.yMin) * scale) + 4)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'

  const ox = -Math.floor(glyph.xMin * scale) + 1 + subPixelX
  const oy = Math.ceil(glyph.yMax * scale) + 1 + subPixelY
  ctx.setTransform(scale, 0, 0, -scale, ox, oy)

  renderGlyphToCanvas(glyph, ctx)
  ctx.fill()

  if (!antiAlias) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const img = ctx.getImageData(0, 0, w, h)
    for (let i = 3; i < img.data.length; i += 4) {
      img.data[i] = img.data[i] >= 128 ? 255 : 0
    }
    ctx.putImageData(img, 0, 0)
  }

  return canvas
}
