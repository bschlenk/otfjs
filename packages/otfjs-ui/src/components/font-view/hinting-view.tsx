import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Font,
  GlyphEnriched,
  GlyphSimple,
  renderGlyphToCanvas,
  getGlyphIndex,
} from 'otfjs'

import { runHintingVM } from './hinting-utils'

import styles from './hinting-view.module.css'

// SVG filter that quantizes alpha to 0 or 1, giving crisp binary pixels.
// Same approach as glyph-editor.tsx.
const BINARY_FILTER = `url('data:image/svg+xml,\
<svg xmlns="http://www.w3.org/2000/svg">\
<filter id="f" color-interpolation-filters="sRGB">\
<feComponentTransfer>\
<feFuncA type="discrete" tableValues="0 0 0 0 0 1 1 1"/>\
</feComponentTransfer>\
</filter>\
</svg>#f')`

export interface HintingViewProps {
  font: Font
  glyphId: number
  onGlyphChange: (id: number) => void
}

export function HintingView({ font, glyphId, onGlyphChange }: HintingViewProps) {
  const [fontSize, setFontSize] = useState(16)
  const [charInput, setCharInput] = useState('')

  const upem = useMemo(() => font.getTable('head').unitsPerEm, [font])
  const numGlyphs = useMemo(() => font.getTable('maxp').numGlyphs, [font])

  // Resolve the glyph, skip composites (no points)
  const glyph = useMemo(() => {
    const g = font.getGlyph(glyphId)
    return 'points' in g ? (g as GlyphEnriched) : null
  }, [font, glyphId])

  // Navigate to a glyph by character input
  const jumpToChar = useCallback(
    (char: string) => {
      if (!char) return
      const cp = char.codePointAt(0)
      if (cp == null) return
      const id = getGlyphIndex(font, cp)
      if (id > 0) onGlyphChange(id)
    },
    [font, onGlyphChange],
  )

  // Find the Unicode character for the current glyph.
  // Scan printable ASCII + Latin Extended (covers all common cases quickly).
  const glyphChar = useMemo(() => {
    for (let cp = 0x20; cp < 0x300; cp++) {
      if (getGlyphIndex(font, cp) === glyphId) {
        return String.fromCodePoint(cp)
      }
    }
    return null
  }, [font, glyphId])

  const scale = fontSize / upem

  const unhintedPixels = useMemo(
    () => (glyph ? renderGlyphToOffscreen(glyph, scale) : null),
    [glyph, scale],
  )

  const hintedResult = useMemo(
    () => (glyph ? runHinting(font, glyph, fontSize, upem) : null),
    [font, glyph, fontSize, upem],
  )

  const hintedPixels = hintedResult?.canvas ?? unhintedPixels
  const hintedGlyph = hintedResult?.glyph ?? glyph
  const hintedScale = hintedResult ? 1 : scale
  const hasHinting = glyph ? glyph.instructions.length > 0 : false

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        {/* Glyph navigation */}
        <div className={styles.glyphNav}>
          <button
            className={styles.navBtn}
            onClick={() => onGlyphChange(Math.max(0, glyphId - 1))}
            title="Previous glyph"
          >
            ‹
          </button>
          <span className={styles.glyphInfo}>
            <span className={styles.glyphChar}>
              {glyphChar ?? (
                <span className={styles.glyphCharMissing}>#{glyphId}</span>
              )}
            </span>
            {glyphChar && (
              <span className={styles.glyphId}>glyph {glyphId}</span>
            )}
          </span>
          <button
            className={styles.navBtn}
            onClick={() => onGlyphChange(Math.min(numGlyphs - 1, glyphId + 1))}
            title="Next glyph"
          >
            ›
          </button>
          <input
            className={styles.charInput}
            value={charInput}
            placeholder="type a char…"
            maxLength={2}
            onChange={(e) => {
              const v = e.target.value
              setCharInput(v)
              jumpToChar(v)
            }}
            onFocus={(e) => e.target.select()}
          />
        </div>

        {/* Font size slider */}
        <div className={styles.sizeControl}>
          <span className={styles.sizeLabel}>8px</span>
          <input
            className={styles.slider}
            type="range"
            min={8}
            max={48}
            step={1}
            value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)}
          />
          <span className={styles.sizeLabel}>48px</span>
          <span className={styles.sizeValue}>{fontSize}px</span>
        </div>

        {!hasHinting && (
          <span className={styles.noHintingNote}>No hinting instructions</span>
        )}
      </div>

      {glyph ? (
        <div className={styles.compare}>
          <GlyphPanel
            label="Without hinting"
            glyph={glyph}
            pixels={unhintedPixels}
            scale={scale}
          />
          <GlyphPanel
            label="With hinting"
            glyph={hintedGlyph ?? glyph}
            pixels={hintedPixels}
            scale={hintedScale}
          />
        </div>
      ) : (
        <div className={styles.empty}>Composite glyph — no outline to hint</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface GlyphPanelProps {
  label: string
  glyph: GlyphSimple
  pixels: HTMLCanvasElement | null
  scale: number
}

function GlyphPanel({ label, glyph, pixels, scale }: GlyphPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const actualRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !pixels) return

    const wrapW = wrap.clientWidth
    const wrapH = wrap.clientHeight

    // Integer zoom: each pixel becomes `zoom` display pixels
    const zoomH = Math.max(1, Math.floor(wrapH / pixels.height))
    const zoomW = Math.max(1, Math.floor(wrapW / pixels.width))
    const zoom = Math.min(zoomH, zoomW)
    const displayW = pixels.width * zoom
    const displayH = pixels.height * zoom

    const dpr = window.devicePixelRatio
    canvas.width = displayW * dpr
    canvas.height = displayH * dpr
    canvas.style.width = `${displayW}px`
    canvas.style.height = `${displayH}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, displayW, displayH)

    // Checkerboard background (shows empty pixels clearly)
    const sq = zoom
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let r = 0; r < pixels.height; r++) {
      for (let c = 0; c < pixels.width; c++) {
        if ((r + c) % 2 === 0) ctx.fillRect(c * sq, r * sq, sq, sq)
      }
    }

    // Scale-up the pixel-exact offscreen canvas — nearest-neighbor via imageSmoothingEnabled
    ctx.drawImage(pixels, 0, 0, displayW, displayH)

    // Pixel grid when large enough
    if (zoom >= 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = 0; x <= pixels.width; x++) {
        ctx.moveTo(x * zoom, 0)
        ctx.lineTo(x * zoom, displayH)
      }
      for (let y = 0; y <= pixels.height; y++) {
        ctx.moveTo(0, y * zoom)
        ctx.lineTo(displayW, y * zoom)
      }
      ctx.stroke()
    }

    // Outline overlay
    if (zoom >= 3) {
      drawOutline(ctx, glyph, scale, zoom)
    }
  }, [pixels, glyph, scale])

  // Redraw on content change
  useEffect(() => {
    draw()
  }, [draw])

  // Redraw on resize
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [draw])

  // Draw actual-size preview
  useEffect(() => {
    const canvas = actualRef.current
    if (!canvas || !pixels) return
    const dpr = window.devicePixelRatio
    // Show at 2x actual pixels for visibility on HiDPI screens
    const displayScale = Math.max(1, Math.ceil(dpr))
    canvas.width = pixels.width * displayScale
    canvas.height = pixels.height * displayScale
    canvas.style.width = `${pixels.width}px`
    canvas.style.height = `${pixels.height}px`
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(pixels, 0, 0, canvas.width, canvas.height)
  }, [pixels])

  return (
    <div className={styles.panel}>
      <span className={styles.panelLabel}>{label}</span>
      <div className={styles.canvasWrap} ref={wrapRef}>
        <canvas ref={canvasRef} className={styles.pixelCanvas} />
      </div>
      <div className={styles.actualSize}>
        <span className={styles.actualLabel}>
          Actual size ({pixels?.width ?? 0}×{pixels?.height ?? 0}px)
        </span>
        <canvas ref={actualRef} className={styles.actualCanvas} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Outline overlay
// ---------------------------------------------------------------------------

function drawOutline(
  ctx: CanvasRenderingContext2D,
  glyph: GlyphSimple,
  scale: number,
  zoom: number,
) {
  if (!glyph.points.length) return

  const xOff = glyph.xMin * scale
  const yOff = glyph.yMax * scale

  // Map glyph coords → display coords
  const tx = (x: number) => (x * scale - xOff) * zoom + 0.5
  const ty = (y: number) => (yOff - y * scale) * zoom + 0.5

  ctx.save()
  ctx.strokeStyle = 'rgba(80, 200, 255, 0.8)'
  ctx.lineWidth = Math.max(0.5, 1 / zoom)
  ctx.beginPath()

  const pts = glyph.points
  const ends = glyph.endPtsOfContours
  let ptIdx = 0

  for (const end of ends) {
    const start = ptIdx
    const count = end - start + 1
    let first = true

    for (let i = 0; i < count; i++) {
      const cur = pts[start + i]
      const prev = pts[start + ((i - 1 + count) % count)]
      const next = pts[start + ((i + 1) % count)]

      if (first) {
        const startX = cur.onCurve ? cur.x : (cur.x + next.x) / 2
        const startY = cur.onCurve ? cur.y : (cur.y + next.y) / 2
        ctx.moveTo(tx(startX), ty(startY))
        first = false
        if (!cur.onCurve) continue
        continue
      }

      if (cur.onCurve) {
        if (prev.onCurve) {
          ctx.lineTo(tx(cur.x), ty(cur.y))
        } else {
          ctx.quadraticCurveTo(tx(prev.x), ty(prev.y), tx(cur.x), ty(cur.y))
        }
      } else if (!prev.onCurve) {
        const mx = (prev.x + cur.x) / 2
        const my = (prev.y + cur.y) / 2
        ctx.quadraticCurveTo(tx(prev.x), ty(prev.y), tx(mx), ty(my))
      }
    }
    // Close with implicit on-curve if needed
    const lastPt = pts[end]
    const firstPt = pts[start]
    if (!lastPt.onCurve) {
      ctx.quadraticCurveTo(tx(lastPt.x), ty(lastPt.y), tx(firstPt.x), ty(firstPt.y))
    }
    ctx.closePath()
    ptIdx = end + 1
  }

  ctx.stroke()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

function renderGlyphToOffscreen(
  glyph: GlyphSimple,
  scale: number,
): HTMLCanvasElement | null {
  if (!glyph.points.length) return null

  const w = Math.max(1, Math.ceil((glyph.xMax - glyph.xMin) * scale) + 2)
  const h = Math.max(1, Math.ceil((glyph.yMax - glyph.yMin) * scale) + 2)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'white'
  ctx.filter = BINARY_FILTER

  const ox = -Math.floor(glyph.xMin * scale) + 1
  const oy = Math.ceil(glyph.yMax * scale) + 1
  ctx.setTransform(scale, 0, 0, -scale, ox, oy)

  renderGlyphToCanvas(glyph, ctx)
  ctx.fill()

  return canvas
}

interface HintResult {
  glyph: GlyphSimple
  canvas: HTMLCanvasElement | null
}

function runHinting(
  font: Font,
  glyph: GlyphSimple,
  fontSize: number,
  upem: number,
): HintResult | null {
  if (!glyph.instructions.length) return null
  const { glyph: hintedGlyph, error } = runHintingVM(font, glyph, fontSize, upem)
  if (error) return null
  const canvas = renderGlyphToOffscreen(hintedGlyph, 1)
  return { glyph: hintedGlyph, canvas }
}
