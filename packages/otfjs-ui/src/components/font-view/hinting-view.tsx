import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Font, getGlyphIndex, GlyphSimple } from 'otfjs'

import { renderGlyphToOffscreen, runHintingVM } from './hinting-utils'

import styles from './hinting-view.module.css'

export interface HintingViewProps {
  font: Font
  glyphId: number
  onGlyphChange: (id: number) => void
}

export function HintingView({
  font,
  glyphId,
  onGlyphChange,
}: HintingViewProps) {
  const [fontSize, setFontSize] = useState(16)
  const [charInput, setCharInput] = useState('')
  const [antiAlias, setAntiAlias] = useState(false)
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })

  const upem = useMemo(() => font.getTable('head').unitsPerEm, [font])
  const numGlyphs = useMemo(() => font.getTable('maxp').numGlyphs, [font])

  // Resolve the glyph, skip composites (no points)
  const glyph = useMemo(() => {
    const g = font.getGlyph(glyphId)
    return 'points' in g ? g : null
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

  // Fractional pixel offset in [0,1) — drives both rendering and grid display shift
  const subPixelX = ((gridOffset.x % 1) + 1) % 1
  const subPixelY = ((gridOffset.y % 1) + 1) % 1
  // Integer parity tracks cumulative full-pixel crossings so the checkerboard
  // doesn't flip when subPixelX wraps at each 1px boundary
  const parityX = ((Math.floor(gridOffset.x) % 2) + 2) % 2
  const parityY = ((Math.floor(gridOffset.y) % 2) + 2) % 2

  const unhintedPixels = useMemo(
    () =>
      glyph ?
        renderGlyphToOffscreen(glyph, scale, antiAlias, subPixelX, subPixelY)
      : null,
    [glyph, scale, antiAlias, subPixelX, subPixelY],
  )

  // VM run — phase-aware, re-runs when phase or font/glyph/size changes
  const hintedGlyphResult = useMemo(
    () =>
      glyph ?
        runHintingVM(font, glyph, fontSize, upem, subPixelX, subPixelY)
      : null,
    [font, glyph, fontSize, upem, subPixelX, subPixelY],
  )

  // Canvas render — phase is baked into the VM output coordinates, so no
  // additional sub-pixel offset here; the bitmap aligns with the grid as-is
  const hintedPixels = useMemo(() => {
    if (!hintedGlyphResult || hintedGlyphResult.error) return null
    return renderGlyphToOffscreen(hintedGlyphResult.glyph, 1, antiAlias, 0, 0)
  }, [hintedGlyphResult, antiAlias])

  const handleDrag = useCallback((dx: number, dy: number) => {
    setGridOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }))
  }, [])

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

        <label className={styles.aaToggle}>
          <input
            type="checkbox"
            checked={antiAlias}
            onChange={(e) => setAntiAlias(e.target.checked)}
          />
          Anti-aliased
        </label>

        {!hasHinting && (
          <span className={styles.noHintingNote}>No hinting instructions</span>
        )}
      </div>

      {glyph ?
        <div className={styles.compare}>
          <GlyphPanel
            label="Without hinting"
            glyph={glyph}
            pixels={unhintedPixels}
            scale={scale}
            subPixelX={subPixelX}
            subPixelY={subPixelY}
            parityX={parityX}
            parityY={parityY}
            onDrag={handleDrag}
          />
          <GlyphPanel
            label="With hinting"
            glyph={glyph}
            pixels={hintedPixels ?? unhintedPixels}
            scale={scale}
            subPixelX={subPixelX}
            subPixelY={subPixelY}
            parityX={parityX}
            parityY={parityY}
            onDrag={handleDrag}
          />
        </div>
      : <div className={styles.empty}>Composite glyph — no outline to hint</div>
      }
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
  subPixelX: number
  subPixelY: number
  parityX: number
  parityY: number
  onDrag: (dx: number, dy: number) => void
}

function GlyphPanel({
  label,
  glyph,
  pixels,
  scale,
  subPixelX,
  subPixelY,
  parityX,
  parityY,
  onDrag,
}: GlyphPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const actualRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef(1)
  const dragRef = useRef<{ x: number; y: number } | null>(null)

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
    zoomRef.current = zoom
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

    // Shift the pixel grid while keeping the glyph path outline fixed
    ctx.save()
    ctx.translate(-subPixelX * zoom, -subPixelY * zoom)

    // Checkerboard background — extends one extra row/col to fill the display
    // after the sub-pixel translate. Parity is derived from the accumulated
    // integer offset so the pattern doesn't flip when subPixelX wraps at 1px.
    const sq = zoom
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let r = 0; r <= pixels.height; r++) {
      for (let c = 0; c <= pixels.width; c++) {
        if ((c + parityX + (r + parityY)) % 2 === 0) {
          ctx.fillRect(c * sq, r * sq, sq, sq)
        }
      }
    }

    // Scale-up the pixel-exact offscreen canvas — nearest-neighbor via imageSmoothingEnabled
    ctx.drawImage(pixels, 0, 0, displayW, displayH)

    // Pixel grid when large enough — extends one extra to cover the trailing gap
    if (zoom >= 5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      for (let x = 0; x <= pixels.width + 1; x++) {
        ctx.moveTo(x * zoom, -zoom)
        ctx.lineTo(x * zoom, displayH + zoom)
      }
      for (let y = 0; y <= pixels.height + 1; y++) {
        ctx.moveTo(-zoom, y * zoom)
        ctx.lineTo(displayW + zoom, y * zoom)
      }
      ctx.stroke()
    }

    ctx.restore()

    // Outline overlay — drawn outside the grid translation so it stays fixed
    if (zoom >= 3) {
      drawOutline(ctx, glyph, scale, zoom)
    }
  }, [pixels, glyph, scale, subPixelX, subPixelY, parityX, parityY])

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY }
    e.preventDefault()
  }, [])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.x
      const dy = e.clientY - dragRef.current.y
      dragRef.current = { x: e.clientX, y: e.clientY }
      onDrag(-dx / zoomRef.current, -dy / zoomRef.current)
    },
    [onDrag],
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current = null
  }, [])

  return (
    <div className={styles.panel}>
      <span className={styles.panelLabel}>{label}</span>
      <div
        className={styles.canvasWrap}
        ref={wrapRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
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

  // Match renderGlyphToOffscreen: ox = -floor(xMin*scale)+1, oy = ceil(yMax*scale)+1
  const xOff = Math.floor(glyph.xMin * scale) - 1
  const yOff = Math.ceil(glyph.yMax * scale) + 1

  // Map glyph coords → display coords
  const tx = (x: number) => (x * scale - xOff) * zoom
  const ty = (y: number) => (yOff - y * scale) * zoom

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
      ctx.quadraticCurveTo(
        tx(lastPt.x),
        ty(lastPt.y),
        tx(firstPt.x),
        ty(firstPt.y),
      )
    }
    ctx.closePath()
    ptIdx = end + 1
  }

  ctx.stroke()
  ctx.restore()
}
