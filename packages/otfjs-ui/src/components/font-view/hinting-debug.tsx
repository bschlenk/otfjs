import { useMemo, useState } from 'react'
import { Font, GlyphEnriched, GlyphSimple, getGlyphIndex, glyphToSvgPath } from 'otfjs'

import { runHintingVM, scaleGlyph } from './hinting-utils'
import styles from './hinting-debug.module.css'

export interface HintingDebugProps {
  font: Font
  glyphId: number
  onGlyphChange: (id: number) => void
}

export function HintingDebug({ font, glyphId, onGlyphChange }: HintingDebugProps) {
  const [fontSize, setFontSize] = useState(16)
  const [charInput, setCharInput] = useState('')
  const [showPoints, setShowPoints] = useState(true)
  const [showGrid, setShowGrid] = useState(true)

  const upem = useMemo(() => font.getTable('head').unitsPerEm, [font])
  const numGlyphs = useMemo(() => font.getTable('maxp').numGlyphs, [font])

  const glyph = useMemo(() => {
    const g = font.getGlyph(glyphId)
    return 'points' in g ? (g as GlyphEnriched) : null
  }, [font, glyphId])

  const glyphChar = useMemo(() => {
    for (let cp = 0x20; cp < 0x300; cp++) {
      if (getGlyphIndex(font, cp) === glyphId) return String.fromCodePoint(cp)
    }
    return null
  }, [font, glyphId])

  const jumpToChar = (char: string) => {
    if (!char) return
    const cp = char.codePointAt(0)
    if (cp == null) return
    const id = getGlyphIndex(font, cp)
    if (id > 0) onGlyphChange(id)
  }

  // Run hinting VM and compare point positions
  const result = useMemo(() => {
    if (!glyph) return null
    const scale = fontSize / upem
    const hasInstructions = glyph.instructions.length > 0

    if (!hasInstructions) {
      return { hasInstructions: false, error: null, movedCount: 0, maxDelta: 0, hintedInFU: glyph as GlyphSimple }
    }

    const { glyph: hintedPx, error } = runHintingVM(font, glyph, fontSize, upem)

    // Convert hinted glyph from pixel space back to font units for overlay
    const hintedInFU = scaleGlyph(hintedPx, 1 / scale)

    // Compute movement stats
    let movedCount = 0
    let maxDeltaPx = 0
    for (let i = 0; i < glyph.points.length; i++) {
      const orig = glyph.points[i]
      const hint = hintedInFU.points[i]
      if (!orig || !hint) continue
      const dxFU = hint.x - orig.x
      const dyFU = hint.y - orig.y
      const deltaPx = Math.hypot(dxFU, dyFU) * scale
      if (deltaPx > 0.01) {
        movedCount++
        if (deltaPx > maxDeltaPx) maxDeltaPx = deltaPx
      }
    }

    return { hasInstructions, error, movedCount, maxDelta: maxDeltaPx, hintedInFU }
  }, [font, glyph, fontSize, upem])

  return (
    <div className={styles.root}>
      {/* Controls */}
      <div className={styles.controls}>
        {/* Glyph nav */}
        <div className={styles.glyphNav}>
          <button className={styles.navBtn} onClick={() => onGlyphChange(Math.max(0, glyphId - 1))}>‹</button>
          <span className={styles.glyphInfo}>
            <span className={styles.glyphChar}>{glyphChar ?? <span className={styles.glyphId}>#{glyphId}</span>}</span>
            {glyphChar && <span className={styles.glyphId}>glyph {glyphId}</span>}
          </span>
          <button className={styles.navBtn} onClick={() => onGlyphChange(Math.min(numGlyphs - 1, glyphId + 1))}>›</button>
          <input
            className={styles.charInput}
            value={charInput}
            placeholder="type a char…"
            maxLength={2}
            onChange={(e) => { setCharInput(e.target.value); jumpToChar(e.target.value) }}
            onFocus={(e) => e.target.select()}
          />
        </div>

        {/* Font size */}
        <div className={styles.sizeControl}>
          <span className={styles.sizeLabel}>8px</span>
          <input className={styles.slider} type="range" min={8} max={48} step={1} value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)} />
          <span className={styles.sizeLabel}>48px</span>
          <span className={styles.sizeValue}>{fontSize}px</span>
        </div>

        {/* Toggles */}
        <label className={styles.toggle}>
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
          <span>pixel grid</span>
        </label>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showPoints} onChange={(e) => setShowPoints(e.target.checked)} />
          <span>points</span>
        </label>

        {/* Legend */}
        <div className={styles.legend}>
          <span className={styles.legendOriginal}>— original</span>
          <span className={styles.legendHinted}>— hinted</span>
        </div>
      </div>

      {/* Status bar */}
      {result && (
        <div className={styles.status}>
          {!result.hasInstructions && (
            <span className={styles.statusWarn}>No hinting instructions in this glyph</span>
          )}
          {result.hasInstructions && result.error && (
            <span className={styles.statusError}>VM error: {result.error}</span>
          )}
          {result.hasInstructions && !result.error && (
            <span className={styles.statusOk}>
              {result.movedCount === 0 ?
                '0 points moved — hinting ran but made no changes'
              : `${result.movedCount} of ${glyph?.points.length ?? 0} points moved · max Δ ${result.maxDelta.toFixed(2)} px`
              }
            </span>
          )}
        </div>
      )}

      {/* SVG overlay */}
      {glyph && result ? (
        <OverlaySvg
          glyph={glyph}
          hinted={result.hintedInFU}
          upem={upem}
          fontSize={fontSize}
          showGrid={showGrid}
          showPoints={showPoints}
        />
      ) : (
        <div className={styles.empty}>Composite glyph — no outline to hint</div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overlay SVG
// ---------------------------------------------------------------------------

interface OverlaySvgProps {
  glyph: GlyphSimple
  hinted: GlyphSimple
  upem: number
  fontSize: number
  showGrid: boolean
  showPoints: boolean
}

function OverlaySvg({ glyph, hinted, upem, fontSize, showGrid, showPoints }: OverlaySvgProps) {
  // grid spacing in font units = 1 pixel worth of font units
  const grid = upem / fontSize

  // Determine view bounds with a 2-pixel margin
  const pad = grid * 2
  const vx = glyph.xMin - pad
  const vy = glyph.yMin - pad
  const vw = (glyph.xMax - glyph.xMin) + pad * 2
  const vh = (glyph.yMax - glyph.yMin) + pad * 2

  // Stroke widths scaled to font units
  const gridStroke = grid * 0.025
  const outlineStroke = grid * 0.06
  const ptRadius = grid * 0.12
  const arrowStroke = grid * 0.05

  // Pixel grid lines (in font-unit space)
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines: React.ReactNode[] = []
    const x0 = Math.floor(vx / grid) * grid
    const x1 = vx + vw
    const y0 = Math.floor(vy / grid) * grid
    const y1 = vy + vh

    for (let x = x0; x <= x1; x += grid) {
      const isBaseline = Math.abs(x) < 0.01
      lines.push(
        <line key={`v${x}`} x1={x} y1={y0} x2={x} y2={y1}
          stroke={isBaseline ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.12)'}
          strokeWidth={isBaseline ? gridStroke * 2 : gridStroke} />,
      )
    }
    for (let y = y0; y <= y1; y += grid) {
      const isBaseline = Math.abs(y) < 0.01
      lines.push(
        <line key={`h${y}`} x1={x0} y1={y} x2={x1} y2={y}
          stroke={isBaseline ? 'rgba(255,100,100,0.4)' : 'rgba(255,255,255,0.12)'}
          strokeWidth={isBaseline ? gridStroke * 2 : gridStroke} />,
      )
    }
    return lines
  }, [showGrid, vx, vy, vw, vh, grid, gridStroke])

  // Path strings
  const origPath = useMemo(() => glyphToSvgPath(glyph), [glyph])
  const hintedPath = useMemo(() => glyphToSvgPath(hinted), [hinted])

  // Point markers + movement arrows
  const pointMarkers = useMemo(() => {
    if (!showPoints) return null
    return glyph.points.map((op, i) => {
      const hp = hinted.points[i]
      if (!hp) return null
      const dx = hp.x - op.x
      const dy = hp.y - op.y
      const moved = Math.hypot(dx, dy) > grid * 0.02

      return (
        <g key={i}>
          {/* Arrow from original to hinted position */}
          {moved && (
            <line x1={op.x} y1={op.y} x2={hp.x} y2={hp.y}
              stroke="rgba(255,200,0,0.9)" strokeWidth={arrowStroke}
              markerEnd="url(#arrow)" />
          )}
          {/* Original point */}
          <circle cx={op.x} cy={op.y} r={ptRadius}
            fill={op.onCurve ? 'rgba(255,80,80,0.9)' : 'rgba(255,80,80,0)'}
            stroke="rgba(255,80,80,0.9)" strokeWidth={arrowStroke} />
          {/* Hinted point (only if moved) */}
          {moved && (
            <circle cx={hp.x} cy={hp.y} r={ptRadius * 1.1}
              fill={hp.onCurve ? 'rgba(80,160,255,0.9)' : 'rgba(80,160,255,0)'}
              stroke="rgba(80,160,255,0.9)" strokeWidth={arrowStroke} />
          )}
        </g>
      )
    })
  }, [glyph.points, hinted.points, showPoints, grid, ptRadius, arrowStroke])

  // Y-flip transform: glyph Y-up → SVG Y-down
  // After flip, y=yMin maps to y=yMax in SVG space; offset by vy
  const flipY = `matrix(1 0 0 -1 0 ${vy + vy + vh})`

  return (
    <svg
      className={styles.svg}
      viewBox={`${vx} ${vy} ${vw} ${vh}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="rgba(255,200,0,0.9)" />
        </marker>
      </defs>

      <g transform={flipY}>
        {/* Pixel grid */}
        {gridLines}

        {/* Original outline — red */}
        <path d={origPath} fill="none"
          stroke="rgba(255,80,80,0.65)" strokeWidth={outlineStroke} />

        {/* Hinted outline — blue */}
        <path d={hintedPath} fill="none"
          stroke="rgba(80,160,255,0.9)" strokeWidth={outlineStroke * 0.8}
          strokeDasharray={`${grid * 0.15} ${grid * 0.08}`} />

        {/* Point markers */}
        {pointMarkers}
      </g>
    </svg>
  )
}
