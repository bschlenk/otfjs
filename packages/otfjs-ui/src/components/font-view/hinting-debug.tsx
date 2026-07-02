import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  disassemble,
  Font,
  getGlyphIndex,
  GlyphEnriched,
  GlyphSimple,
  glyphToSvgPath,
  VirtualMachine,
} from 'otfjs'

import { ResizeDivider } from '../resize-divider/resize-divider'
import { renderGlyphToOffscreen, scaleGlyph } from './hinting-utils'

import styles from './hinting-debug.module.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'fpgm' | 'prep' | 'glyph'
type PixelMode = 'off' | 'pixels' | 'aa'
type GS = VirtualMachine['gs']

const ROUND_NAMES = [
  'HALF_GRID', 'GRID', 'DOUBLE_GRID', 'DOWN_TO_GRID', 'UP_TO_GRID', 'OFF', 'CUSTOM',
]

// ---------------------------------------------------------------------------
// Phase setup
// ---------------------------------------------------------------------------

interface PhaseSetup {
  vm: VirtualMachine
  inst: Uint8Array
  initialCvt: number[]
  /** Scaled glyph (pixel space) at the start of the phase — used as the "original" overlay */
  originalGlyph: GlyphSimple | null
  scale: number
  numGlyphPoints: number
}

function buildPhase(
  font: Font,
  glyph: GlyphSimple | null,
  fontSize: number,
  upem: number,
  phase: Phase,
): PhaseSetup | null {
  let inst: Uint8Array | null
  if (phase === 'fpgm') inst = font.getTableOrNull('fpgm')
  else if (phase === 'prep') inst = font.getTableOrNull('prep')
  else inst = glyph ? glyph.instructions : null

  if (!inst || inst.length === 0) return null

  const vm = new VirtualMachine(font)
  vm.setFontSize(fontSize)
  const scale = fontSize / upem

  if (phase === 'prep') {
    vm.runFpgm()
  } else if (phase === 'glyph') {
    vm.runFpgm()
    vm.runPrep()

    if (!glyph) return null
    const scaledGlyph = scaleGlyph(glyph, scale)

    let awFU = 0
    let lsbFU = glyph.xMin
    try {
      const hmtx = font.getTable('hmtx')
      const id = (glyph as GlyphEnriched).id ?? 0
      const rec =
        hmtx.longHorMetrics[id] ?? hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]
      if (rec) {
        awFU = rec.advanceWidth
        lsbFU = rec.leftSideBearing
      }
    } catch {
      // hmtx unavailable
    }

    vm.setGlyph(scaledGlyph, awFU * scale, lsbFU * scale)
  }

  vm.stack.clear()
  vm.pc = 0

  const initialCvt = [...vm.cvt]
  const originalGlyph =
    phase === 'glyph' && glyph ? scaleGlyph(glyph, scale) : null

  return {
    vm,
    inst,
    initialCvt,
    originalGlyph,
    scale,
    numGlyphPoints: glyph?.points.length ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface HintingDebugProps {
  font: Font
  glyphId: number
  onGlyphChange: (id: number) => void
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HintingDebug({ font, glyphId, onGlyphChange }: HintingDebugProps) {
  const [phase, setPhase] = useState<Phase>('glyph')
  const [fontSize, setFontSize] = useState(16)
  const [instrWidth, setInstrWidth] = useState(310)
  const [stateHeight, setStateHeight] = useState(210)
  const [charInput, setCharInput] = useState('')
  const [showGrid, setShowGrid] = useState(true)
  const [showPoints, setShowPoints] = useState(true)
  const [pixelMode, setPixelMode] = useState<PixelMode>('off')
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set())
  const [tick, setTick] = useState(0)
  const [vmError, setVmError] = useState<string | null>(null)

  const upem = useMemo(() => font.getTable('head').unitsPerEm, [font])
  const numGlyphs = useMemo(() => font.getTable('maxp').numGlyphs, [font])

  const glyph = useMemo(() => {
    const g = font.getGlyph(glyphId)
    return 'points' in g ? (g) : null
  }, [font, glyphId])

  const glyphChar = useMemo(() => {
    for (let cp = 0x20; cp < 0x300; cp++) {
      if (getGlyphIndex(font, cp) === glyphId) return String.fromCodePoint(cp)
    }
    return null
  }, [font, glyphId])

  const setupRef = useRef<PhaseSetup | null>(null)

  const rebuild = useCallback(() => {
    setVmError(null)
    try {
      setupRef.current = buildPhase(font, glyph, fontSize, upem, phase)
    } catch (e) {
      setupRef.current = null
      setVmError(String(e))
    }
    setTick(t => t + 1)
  }, [font, glyph, fontSize, upem, phase])

  // initialize: rebuild then auto-run glyph phase to end so the first paint
  // shows the hinted result (same as the old static Debug view).
  const initialize = useCallback(() => {
    setVmError(null)
    try {
      setupRef.current = buildPhase(font, glyph, fontSize, upem, phase)
    } catch (e) {
      setupRef.current = null
      setVmError(String(e))
      setTick(t => t + 1)
      return
    }

    if (phase === 'glyph') {
      const s = setupRef.current
      if (s) {
        const MAX_STEPS = 500_000
        let steps = 0
        while (steps++ < MAX_STEPS && s.vm.pc < s.inst.length) {
          try {
            s.vm.step(s.inst)
          } catch (e) {
            setVmError(String(e))
            break
          }
        }
      }
    }

    setTick(t => t + 1)
  }, [font, glyph, fontSize, upem, phase])

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    setBreakpoints(new Set())
  }, [phase, glyphId])

  const instBytes = useMemo(() => {
    if (phase === 'fpgm') return font.getTableOrNull('fpgm')
    if (phase === 'prep') return font.getTableOrNull('prep')
    return glyph?.instructions ?? null
  }, [font, glyph, phase])

  const disasm = useMemo(() => {
    return instBytes && instBytes.length > 0 ? disassemble(instBytes) : []
  }, [instBytes])

  const doStep = useCallback((): boolean => {
    const s = setupRef.current
    if (!s || s.vm.pc >= s.inst.length) return false
    try {
      s.vm.step(s.inst)
    } catch (e) {
      setVmError(String(e))
      setTick(t => t + 1)
      return false
    }
    setTick(t => t + 1)
    return true
  }, [])

  const doRun = useCallback(() => {
    const s = setupRef.current
    if (!s) return
    const MAX_STEPS = 500_000
    let steps = 0
    while (steps++ < MAX_STEPS) {
      if (s.vm.pc >= s.inst.length) break
      try {
        s.vm.step(s.inst)
      } catch (e) {
        setVmError(String(e))
        break
      }
      if (breakpoints.has(s.vm.pc)) break
    }
    setTick(t => t + 1)
  }, [breakpoints])

  const doRunToLine = useCallback((targetPc: number) => {
    const s = setupRef.current
    if (!s || s.vm.pc >= s.inst.length || s.vm.pc === targetPc) return
    const MAX_STEPS = 500_000
    let steps = 0
    while (steps++ < MAX_STEPS) {
      if (s.vm.pc >= s.inst.length || s.vm.pc === targetPc) break
      try {
        s.vm.step(s.inst)
      } catch (e) {
        setVmError(String(e))
        break
      }
    }
    setTick(t => t + 1)
  }, [])

  const toggleBreakpoint = useCallback((pc: number) => {
    setBreakpoints(prev => {
      const next = new Set(prev)
      if (next.has(pc)) next.delete(pc)
      else next.add(pc)
      return next
    })
  }, [])

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

  // Read VM state snapshot for rendering
  const s = setupRef.current
  void tick
  const vm = s?.vm
  const currentPc = vm?.pc ?? 0
  const isDone = !s || (vm?.pc ?? 0) >= s.inst.length

  const stackDepth = vm?.stack.depth() ?? 0
  const stackValues = vm
    ? Array.from({ length: stackDepth }, (_, i) => vm.stack.at(stackDepth - 1 - i))
    : []

  const cvt = vm?.cvt ?? []
  const initialCvt = s?.initialCvt ?? []
  const gs = vm?.gs ?? null
  const zones = vm?.zones ?? [[], []]
  const originalGlyph = s?.originalGlyph ?? null
  const numGlyphPoints = s?.numGlyphPoints ?? 0

  return (
    <div className={styles.root}>
      {/* ── Toolbar ── */}
      <div className={styles.toolbar}>
        {/* Phase tabs */}
        <div className={styles.phaseTabs}>
          {(['fpgm', 'prep', 'glyph'] as Phase[]).map(p => (
            <button
              key={p}
              className={`${styles.phaseTab} ${phase === p ? styles.phaseTabActive : ''}`}
              onClick={() => setPhase(p)}
            >
              {p}
            </button>
          ))}
        </div>

        <div className={styles.sep} />

        {/* Glyph nav */}
        <div className={styles.glyphNav}>
          <button
            className={styles.navBtn}
            onClick={() => onGlyphChange(Math.max(0, glyphId - 1))}
          >
            ‹
          </button>
          <span className={styles.glyphInfo}>
            <span className={styles.glyphChar}>
              {glyphChar ?? <span className={styles.glyphId}>#{glyphId}</span>}
            </span>
            {glyphChar && <span className={styles.glyphId}>glyph {glyphId}</span>}
          </span>
          <button
            className={styles.navBtn}
            onClick={() => onGlyphChange(Math.min(numGlyphs - 1, glyphId + 1))}
          >
            ›
          </button>
          <input
            className={styles.charInput}
            value={charInput}
            placeholder="char…"
            maxLength={2}
            onChange={e => {
              setCharInput(e.target.value)
              jumpToChar(e.target.value)
            }}
            onFocus={e => e.target.select()}
          />
        </div>

        {/* Font size */}
        <div className={styles.sizeControl}>
          <span className={styles.sizeLabel}>8px</span>
          <input
            className={styles.slider}
            type="range"
            min={8}
            max={48}
            step={1}
            value={fontSize}
            onChange={e => setFontSize(+e.target.value)}
          />
          <span className={styles.sizeLabel}>48px</span>
          <span className={styles.sizeValue}>{fontSize}px</span>
        </div>

        <div className={styles.sep} />

        {/* Debug controls */}
        <button className={styles.dbgBtn} onClick={rebuild} title="Reset to beginning (⏮)">
          ⏮
        </button>
        <button
          className={styles.dbgBtn}
          onClick={doStep}
          disabled={isDone || vmError != null}
          title="Step one instruction (→)"
        >
          →
        </button>
        <button
          className={`${styles.dbgBtn} ${styles.dbgBtnRun}`}
          onClick={doRun}
          disabled={isDone || vmError != null}
          title="Run to next breakpoint or end"
        >
          ▶ Run
        </button>

        {/* Status chip */}
        <div className={styles.statusChip}>
          {vmError ? (
            <span className={styles.statusError} title={vmError}>
              error
            </span>
          ) : !s ? (
            <span className={styles.statusWarn}>no instructions</span>
          ) : isDone ? (
            <span className={styles.statusDone}>done</span>
          ) : (
            <span className={styles.statusPc}>
              pc&nbsp;
              <code>0x{currentPc.toString(16).padStart(4, '0')}</code>
            </span>
          )}
        </div>

        <div className={styles.sep} />

        {/* Pixel rendering mode */}
        <div className={styles.sizeControl}>
          <span className={styles.sizeLabel}>pixel</span>
          <div className={styles.phaseTabs}>
            {(['off', 'pixels', 'aa'] as PixelMode[]).map(m => (
              <button
                key={m}
                className={`${styles.phaseTab} ${pixelMode === m ? styles.phaseTabActive : ''}`}
                onClick={() => setPixelMode(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* View toggles */}
        <div className={styles.toggles}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={e => setShowGrid(e.target.checked)}
            />
            grid
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showPoints}
              onChange={e => setShowPoints(e.target.checked)}
            />
            points
          </label>
        </div>
      </div>

      {/* ── Body ── */}
      <div className={styles.body}>
        {/* Left: instruction listing */}
        <InstructionPanel
          disasm={disasm}
          currentPc={isDone ? -1 : currentPc}
          breakpoints={breakpoints}
          onToggleBreakpoint={toggleBreakpoint}
          onRunToLine={doRunToLine}
          style={{ width: instrWidth }}
        />
        <ResizeDivider
          direction="col"
          onDrag={dx => setInstrWidth(w => Math.max(150, Math.min(600, w + dx)))}
        />

        {/* Right: canvas + state panels */}
        <div className={styles.rightPanel}>
          <div className={styles.canvasArea}>
            {phase === 'glyph' && originalGlyph ? (
              <StepperCanvas
                originalGlyph={originalGlyph}
                currentZone1={zones[1] ?? []}
                currentZone0={zones[0] ?? []}
                gs={gs}
                showGrid={showGrid}
                showPoints={showPoints}
                numGlyphPoints={numGlyphPoints}
                pixelMode={pixelMode}
              />
            ) : (
              <div className={styles.canvasEmpty}>
                {phase === 'fpgm'
                  ? 'fpgm defines functions — no glyph to preview'
                  : phase === 'prep'
                    ? 'prep sets CVT values — no glyph to preview'
                    : 'No glyph outline available'}
              </div>
            )}
          </div>

          <ResizeDivider
            direction="row"
            onDrag={dy => setStateHeight(h => Math.max(80, Math.min(600, h - dy)))}
          />
          <div className={styles.stateArea} style={{ height: stateHeight }}>
            <StackPanel values={stackValues} />
            <VectorsPanel gs={gs} />
            <RefPointsPanel gs={gs} zones={zones} />
            <CvtPanel cvt={cvt} initialCvt={initialCvt} />
            <GsPanel gs={gs} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Instruction panel
// ---------------------------------------------------------------------------

interface InstructionPanelProps {
  disasm: ReturnType<typeof disassemble>
  currentPc: number
  breakpoints: Set<number>
  onToggleBreakpoint: (pc: number) => void
  onRunToLine: (pc: number) => void
  style?: React.CSSProperties
}

function InstructionPanel({
  disasm,
  currentPc,
  breakpoints,
  onToggleBreakpoint,
  onRunToLine,
  style,
}: InstructionPanelProps) {
  const activeRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentPc])

  if (disasm.length === 0) {
    return (
      <div className={styles.instrPanel} style={style}>
        <div className={styles.instrHeader}>No instructions</div>
      </div>
    )
  }

  return (
    <div className={styles.instrPanel} style={style}>
      <div className={styles.instrHeader}>{disasm.length} instructions</div>
      <div className={styles.instrList}>
        {disasm.map((entry, i) => {
          const isActive = entry.pc === currentPc
          const hasBp = breakpoints.has(entry.pc)
          return (
            <div
              key={i}
              ref={isActive ? el => { activeRef.current = el } : undefined}
              className={`${styles.instrRow}${isActive ? ` ${styles.instrRowActive}` : ''}${hasBp ? ` ${styles.instrRowBp}` : ''}`}
            >
              <div
                className={styles.instrGutter}
                onClick={() => onToggleBreakpoint(entry.pc)}
                title="Toggle breakpoint"
              >
                {hasBp && <span className={styles.bpDot}>●</span>}
                {isActive && !hasBp && <span className={styles.pcArrow}>►</span>}
                {isActive && hasBp && <span className={styles.pcArrowBp}>►</span>}
              </div>
              <span className={styles.instrPc}>
                {entry.pc.toString(16).padStart(4, '0')}
              </span>
              <span className={styles.instrName}>{entry.name}</span>
              {entry.args && entry.args.length > 0 && (
                <span className={styles.instrArgs}>{entry.args.join(' ')}</span>
              )}
              <button
                className={styles.runHereBtn}
                title="Run to here"
                onClick={() => onRunToLine(entry.pc)}
              >
                ▷
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Glyph canvas
// ---------------------------------------------------------------------------

interface StepperCanvasProps {
  originalGlyph: GlyphSimple
  currentZone1: { x: number; y: number; onCurve: boolean }[]
  currentZone0: { x: number; y: number; onCurve: boolean }[]
  gs: GS | null
  showGrid: boolean
  showPoints: boolean
  numGlyphPoints: number
  pixelMode: PixelMode
}

function StepperCanvas({
  originalGlyph,
  currentZone1,
  currentZone0,
  gs,
  showGrid,
  showPoints,
  numGlyphPoints,
  pixelMode,
}: StepperCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pixelCanvasRef = useRef<HTMLCanvasElement>(null)
  const [container, setContainer] = useState({ w: 0, h: 0, ppu: 1 })

  const glyphH = Math.max(originalGlyph.yMax - originalGlyph.yMin, 1)
  const pad = glyphH * 0.15

  // Glyph-content viewBox bounds
  const vx = originalGlyph.xMin - pad
  const vy = originalGlyph.yMin - pad
  const vw = originalGlyph.xMax - originalGlyph.xMin + pad * 2
  const vh = glyphH + pad * 2

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      const ppu = Math.min(width / vw, height / vh)
      setContainer({ w: width, h: height, ppu })
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    measure()
    return () => ro.disconnect()
  }, [vw, vh])

  const { w: svgW, h: svgH, ppu: pxPerUnit } = container

  const u = (px: number) => px / pxPerUnit

  const ptR      = u(4)
  const origR    = u(3)
  const ringR    = [u(7), u(10), u(13)]
  const ringSW   = u(1.5)
  const labelSz  = u(11)
  const labelOff = u(8)
  const arrowLen = u(6)
  const arrowW   = u(3)

  // Expanded viewBox that exactly fills the container
  const cx = vx + vw / 2
  const cy = vy + vh / 2
  const evw = svgW > 0 ? svgW / pxPerUnit : vw
  const evh = svgH > 0 ? svgH / pxPerUnit : vh
  const evx = cx - evw / 2
  const evy = cy - evh / 2

  const flipY = `matrix(1 0 0 -1 0 ${vy * 2 + vh})`

  const currentPoints = currentZone1.slice(0, numGlyphPoints)
  const originalPoints = originalGlyph.points

  const origPath = useMemo(() => glyphToSvgPath(originalGlyph), [originalGlyph])
  const currPath = useMemo(() => {
    if (!currentPoints.length) return ''
    return glyphToSvgPath({ ...originalGlyph, points: currentPoints })
  }, [originalGlyph, currentPoints])

  // Pixel overlay canvas — renders current hinted glyph as zoomed-up pixels
  useEffect(() => {
    const canvas = pixelCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (pixelMode === 'off' || !currentPoints.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      return
    }

    const { w: cW, h: cH, ppu } = container
    if (cW === 0 || cH === 0 || ppu <= 0) return

    const currentGlyph: GlyphSimple = { ...originalGlyph, points: currentPoints }
    const offscreen = renderGlyphToOffscreen(currentGlyph, 1, pixelMode === 'aa')
    if (!offscreen) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = cW * dpr
    canvas.height = cH * dpr
    canvas.style.width = `${cW}px`
    canvas.style.height = `${cH}px`

    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, cW, cH)

    // Recompute viewbox geometry (mirrors the SVG computation above)
    const glH = Math.max(originalGlyph.yMax - originalGlyph.yMin, 1)
    const pd = glH * 0.15
    const vxC = originalGlyph.xMin - pd
    const vyC = originalGlyph.yMin - pd
    const vwC = originalGlyph.xMax - originalGlyph.xMin + pd * 2
    const vhC = glH + pd * 2
    const cxC = vxC + vwC / 2
    const cyC = vyC + vhC / 2
    const evwC = cW / ppu
    const evhC = cH / ppu
    const evxC = cxC - evwC / 2
    const evyC = cyC - evhC / 2
    const flipAnchor = vyC * 2 + vhC // = yMin + yMax

    // renderGlyphToOffscreen with scale=1 places glyph origin at (ox, oy)
    const ox = -Math.floor(originalGlyph.xMin) + 1
    const oy = Math.ceil(originalGlyph.yMax) + 1

    // Align canvas pixel (ox, oy) with the SVG's glyph origin in screen space
    const dx = (-evxC - ox) * ppu
    const dy = (flipAnchor - evyC - oy) * ppu

    ctx.globalAlpha = 0.55
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(offscreen, dx, dy, offscreen.width * ppu, offscreen.height * ppu)
  }, [pixelMode, container, currentPoints, originalGlyph])

  // Pixel grid covering the full expanded viewBox
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines: React.ReactNode[] = []
    const x0 = Math.floor(evx), x1 = Math.ceil(evx + evw)
    const y0 = Math.floor(evy), y1 = Math.ceil(evy + evh)
    for (let x = x0; x <= x1; x++)
      lines.push(<line key={`v${x}`} x1={x} y1={y0} x2={x} y2={y1}
        stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)
    for (let y = y0; y <= y1; y++)
      lines.push(<line key={`h${y}`} x1={x0} y1={y} x2={x1} y2={y}
        stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)
    return lines
  }, [showGrid, evx, evy, evw, evh])

  const rp0 = gs?.rp0 ?? -1
  const rp1 = gs?.rp1 ?? -1
  const rp2 = gs?.rp2 ?? -1
  const zp0 = gs?.zp0 ?? 1
  const zp1 = gs?.zp1 ?? 1
  const zp2 = gs?.zp2 ?? 1
  const getRpPoint = (idx: number, zp: number) =>
    (zp === 0 ? currentZone0 : currentZone1)[idx] ?? null
  const rp0Pt = getRpPoint(rp0, zp0)
  const rp1Pt = getRpPoint(rp1, zp1)
  const rp2Pt = getRpPoint(rp2, zp2)

  // Circles only — arrows are rendered in a separate pass on top
  const pointCircles = useMemo(() => {
    if (!showPoints || !currentPoints.length) return null
    return currentPoints.map((cp, i) => {
      const op = originalPoints[i]
      if (!op) return null
      const isRp0 = i === rp0 && zp0 === 1
      const isRp1 = i === rp1 && zp1 === 1
      const isRp2 = i === rp2 && zp2 === 1
      return (
        <g key={i}>
          <circle cx={op.x} cy={op.y} r={origR}
            fill={op.onCurve ? 'rgba(255,80,80,0.45)' : 'none'}
            stroke="rgba(255,80,80,0.45)" strokeWidth={1}
            vectorEffect="non-scaling-stroke" />
          <circle cx={cp.x} cy={cp.y} r={ptR}
            fill={cp.onCurve ? 'rgba(80,160,255,0.9)' : 'none'}
            stroke="rgba(80,160,255,0.9)" strokeWidth={1}
            vectorEffect="non-scaling-stroke" />
          {isRp0 && <circle cx={cp.x} cy={cp.y} r={ringR[0]}
            fill="none" stroke="rgba(0,220,255,0.85)" strokeWidth={ringSW}
            vectorEffect="non-scaling-stroke" />}
          {isRp1 && <circle cx={cp.x} cy={cp.y} r={ringR[1]}
            fill="none" stroke="rgba(100,255,100,0.85)" strokeWidth={ringSW}
            vectorEffect="non-scaling-stroke" />}
          {isRp2 && <circle cx={cp.x} cy={cp.y} r={ringR[2]}
            fill="none" stroke="rgba(255,100,220,0.85)" strokeWidth={ringSW}
            vectorEffect="non-scaling-stroke" />}
        </g>
      )
    })
  }, [showPoints, currentPoints, originalPoints, ptR, origR, ringR, ringSW, rp0, rp1, rp2, zp0, zp1, zp2])

  // Movement arrows rendered after circles so they appear on top.
  // Each arrow is a stem line + filled polygon arrowhead, sized in viewBox
  // units via u() so they stay a fixed number of screen pixels.
  const movementArrows = useMemo(() => {
    if (!showPoints || !currentPoints.length) return null
    return currentPoints.map((cp, i) => {
      const op = originalPoints[i]
      if (!op) return null
      const dx = cp.x - op.x
      const dy = cp.y - op.y
      const len = Math.hypot(dx, dy)
      if (len < 0.01) return null

      const nx = dx / len
      const ny = dy / len
      // Perpendicular (left of direction)
      const px = -ny
      const py = nx

      // Scale arrowhead down proportionally for very short movements
      const al = Math.min(arrowLen, len * 0.75)
      const aw = arrowW * (al / arrowLen)

      // Stem ends at the arrowhead base; tip is at cp
      const bx = cp.x - al * nx
      const by = cp.y - al * ny

      return (
        <g key={i}>
          <line x1={op.x} y1={op.y} x2={bx} y2={by}
            stroke="rgba(255,200,0,0.65)" strokeWidth={1}
            vectorEffect="non-scaling-stroke" />
          <polygon
            points={`${cp.x},${cp.y} ${bx + aw*px},${by + aw*py} ${bx - aw*px},${by - aw*py}`}
            fill="rgba(255,200,0,0.8)"
          />
        </g>
      )
    })
  }, [showPoints, currentPoints, originalPoints, arrowLen, arrowW])

  const twilightMarkers = useMemo(() => {
    return currentZone0.map((p, i) => {
      if (Math.abs(p.x) < 0.001 && Math.abs(p.y) < 0.001) return null
      const isRp0 = i === rp0 && zp0 === 0
      const isRp1 = i === rp1 && zp1 === 0
      const isRp2 = i === rp2 && zp2 === 0
      return (
        <g key={`z0-${i}`}>
          <circle cx={p.x} cy={p.y} r={ptR}
            fill="rgba(255,200,0,0.8)" stroke="rgba(255,200,0,0.9)"
            strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {isRp0 && <circle cx={p.x} cy={p.y} r={ringR[0]}
            fill="none" stroke="rgba(0,220,255,0.85)" strokeWidth={ringSW} vectorEffect="non-scaling-stroke" />}
          {isRp1 && <circle cx={p.x} cy={p.y} r={ringR[1]}
            fill="none" stroke="rgba(100,255,100,0.85)" strokeWidth={ringSW} vectorEffect="non-scaling-stroke" />}
          {isRp2 && <circle cx={p.x} cy={p.y} r={ringR[2]}
            fill="none" stroke="rgba(255,100,220,0.85)" strokeWidth={ringSW} vectorEffect="non-scaling-stroke" />}
        </g>
      )
    }).filter(Boolean)
  }, [currentZone0, ptR, ringR, ringSW, rp0, rp1, rp2, zp0, zp1, zp2])

  const rpLabels = useMemo(() => {
    if (!showPoints) return null
    const entries = [
      { pt: rp0Pt, label: 'rp0', color: 'rgba(0,220,255,0.9)' },
      { pt: rp1Pt, label: 'rp1', color: 'rgba(100,255,100,0.9)' },
      { pt: rp2Pt, label: 'rp2', color: 'rgba(255,100,220,0.9)' },
    ]
    return entries.map(({ pt, label, color }) => {
      if (!pt) return null
      return (
        <text key={label}
          transform={`translate(${pt.x + labelOff}, ${pt.y}) scale(1,-1)`}
          y={labelSz * 0.35}
          fontSize={labelSz}
          fill={color}
          fontFamily="monospace"
          style={{ userSelect: 'none' }}
        >
          {label}
        </text>
      )
    })
  }, [showPoints, rp0Pt, rp1Pt, rp2Pt, labelSz, labelOff])

  return (
    <div ref={containerRef} className={styles.canvas}>
      <canvas ref={pixelCanvasRef} className={styles.pixelOverlay} />
      <svg
        className={styles.svgOverlay}
        viewBox={`${evx} ${evy} ${evw} ${evh}`}
      >
        <g transform={flipY}>
          {gridLines}

          <line x1={evx} y1={0} x2={evx + evw} y2={0}
            stroke="rgba(255,160,80,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <line x1={0} y1={evy} x2={0} y2={evy + evh}
            stroke="rgba(255,160,80,0.5)" strokeWidth={1} vectorEffect="non-scaling-stroke" />

          <path d={origPath} fill="none"
            stroke="rgba(255,80,80,0.5)" strokeWidth={1.5}
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke" />

          {currPath && (
            <path d={currPath} fill="none"
              stroke="rgba(80,160,255,0.85)" strokeWidth={1.5}
              vectorEffect="non-scaling-stroke" />
          )}

          {twilightMarkers}
          {pointCircles}
          {rpLabels}
          {movementArrows}
        </g>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Stack panel
// ---------------------------------------------------------------------------

function StackPanel({ values }: { values: number[] }) {
  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHeader}>
        Stack
        <span className={styles.statePanelCount}>{values.length}</span>
      </div>
      <div className={styles.statePanelBody}>
        {values.length === 0 ? (
          <span className={styles.emptyNote}>empty</span>
        ) : (
          values.map((v, i) => (
            <div key={i} className={`${styles.stackRow} ${i === 0 ? styles.stackRowTop : ''}`}>
              <span className={styles.stackVal}>{v}</span>
              {v !== 0 && (v & 0x3f) !== 0 && (
                <span className={styles.stackHint}>{(v / 64).toFixed(2)}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Vectors panel
// ---------------------------------------------------------------------------

function VectorsPanel({ gs }: { gs: GS | null }) {
  const fv = gs?.freedomVector ?? { x: 1, y: 0 }
  const pv = gs?.projectionVector ?? { x: 1, y: 0 }
  const dpv = gs?.dualProjectionVector

  const pvEqDpv =
    !dpv || (Math.abs(dpv.x - pv.x) < 0.001 && Math.abs(dpv.y - pv.y) < 0.001)

  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHeader}>Vectors</div>
      <div className={styles.statePanelBody}>
        <VecRow label="freedom" vec={fv} color="#ff9966" />
        <VecRow label="project" vec={pv} color="#66aaff" />
        <VecRow
          label="dual"
          vec={pvEqDpv ? pv : dpv}
          color="#aaffaa"
          dim={pvEqDpv}
          dimLabel="= proj"
        />
      </div>
    </div>
  )
}

function VecRow({
  label,
  vec,
  color,
  dim,
  dimLabel,
}: {
  label: string
  vec: { x: number; y: number }
  color: string
  dim?: boolean
  dimLabel?: string
}) {
  return (
    <div className={`${styles.vecRow} ${dim ? styles.vecRowDim : ''}`}>
      <span className={styles.vecLabel}>{label}</span>
      <VectorWidget x={vec.x} y={vec.y} color={color} />
      {dim && dimLabel ? (
        <span className={styles.vecDimLabel}>{dimLabel}</span>
      ) : (
        <span className={styles.vecCoords} style={{ color }}>
          ({vec.x.toFixed(2)}, {vec.y.toFixed(2)})
        </span>
      )}
    </div>
  )
}

function VectorWidget({ x, y, color }: { x: number; y: number; color: string }) {
  const id = useId()
  const markerId = `vm-arr-${id}`
  const angle = Math.atan2(y, x)
  const r = 9
  const ex = r * Math.cos(angle)
  const ey = -r * Math.sin(angle)

  return (
    <svg
      width="26"
      height="26"
      viewBox="-13 -13 26 26"
      className={styles.vectorSvg}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth="4"
          markerHeight="4"
          refX="3.5"
          refY="2"
          orient="auto"
        >
          <path d="M0,0 L0,4 L4,2 z" fill={color} />
        </marker>
      </defs>
      <circle r="12" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      <line
        x1="0" y1="0" x2={ex} y2={ey}
        stroke={color}
        strokeWidth="1.5"
        markerEnd={`url(#${markerId})`}
      />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Reference points panel
// ---------------------------------------------------------------------------

function RefPointsPanel({
  gs,
  zones,
}: {
  gs: GS | null
  zones: { x: number; y: number }[][]
}) {
  if (!gs) return <div className={styles.statePanel}><div className={styles.statePanelHeader}>Ref Points</div></div>

  const { rp0, rp1, rp2, zp0, zp1, zp2 } = gs
  const getCoord = (idx: number, zp: number) => zones[zp]?.[idx]

  const rows = [
    { name: 'rp0', idx: rp0, zp: zp0, color: 'rgba(0,220,255,0.9)' },
    { name: 'rp1', idx: rp1, zp: zp1, color: 'rgba(100,255,100,0.9)' },
    { name: 'rp2', idx: rp2, zp: zp2, color: 'rgba(255,100,220,0.9)' },
  ]

  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHeader}>Ref Points</div>
      <div className={styles.statePanelBody}>
        {rows.map(({ name, idx, zp, color }) => {
          const pt = getCoord(idx, zp)
          return (
            <div key={name} className={styles.rpRow}>
              <span className={styles.rpName} style={{ color }}>{name}</span>
              <span className={styles.rpIndex}>z{zp} pt#{idx}</span>
              {pt ? (
                <span className={styles.rpCoords}>
                  ({pt.x.toFixed(1)}, {pt.y.toFixed(1)})
                </span>
              ) : (
                <span className={styles.emptyNote}>—</span>
              )}
            </div>
          )
        })}
        <div className={styles.rpZoneRow}>
          <span className={styles.rpZoneLabel}>zp0/1/2</span>
          <span className={styles.rpZoneVal}>{zp0} / {zp1} / {zp2}</span>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CVT panel
// ---------------------------------------------------------------------------

function CvtPanel({ cvt, initialCvt }: { cvt: number[]; initialCvt: number[] }) {
  const entries: { idx: number; val: number; changed: boolean }[] = []
  const len = Math.max(cvt.length, initialCvt.length)
  for (let i = 0; i < len; i++) {
    const val = cvt[i] ?? 0
    const init = initialCvt[i] ?? 0
    const changed = Math.abs(val - init) > 0.001
    const nonZero = Math.abs(val) > 0.001
    if (changed || nonZero) entries.push({ idx: i, val, changed })
  }

  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHeader}>
        CVT
        {entries.some(e => e.changed) && (
          <span className={styles.statePanelCount}>
            {entries.filter(e => e.changed).length} changed
          </span>
        )}
      </div>
      <div className={styles.statePanelBody}>
        {entries.length === 0 ? (
          <span className={styles.emptyNote}>all zero</span>
        ) : (
          entries.map(({ idx, val, changed }) => (
            <div key={idx} className={`${styles.cvtRow} ${changed ? styles.cvtRowChanged : ''}`}>
              <span className={styles.cvtIdx}>[{idx}]</span>
              <span className={styles.cvtVal}>{val.toFixed(2)}</span>
              {changed && <span className={styles.cvtChangedDot}>●</span>}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Graphics state panel
// ---------------------------------------------------------------------------

function GsPanel({ gs }: { gs: GS | null }) {
  if (!gs)
    return (
      <div className={styles.statePanel}>
        <div className={styles.statePanelHeader}>Graphics State</div>
      </div>
    )

  const roundName = ROUND_NAMES[gs.roundState] ?? `custom(${gs.roundState})`

  return (
    <div className={styles.statePanel}>
      <div className={styles.statePanelHeader}>Graphics State</div>
      <div className={styles.statePanelBody}>
        <GsRow label="round" value={roundName} />
        <GsRow label="loop" value={gs.loop} />
        <GsRow label="minDist" value={gs.minimumDistance.toFixed(3)} />
        <GsRow label="cvtCutIn" value={gs.controlValueCutIn.toFixed(3)} />
        <GsRow label="autoFlip" value={gs.autoFlip ? 'true' : 'false'} />
        <GsRow label="swCutIn" value={gs.singeWidthCutIn.toFixed(3)} />
        <GsRow label="swValue" value={gs.singleWidthValue.toFixed(3)} />
        <GsRow label="deltaBase" value={gs.deltaBase} />
        <GsRow label="deltaShift" value={gs.deltaShift} />
        {gs.instructControl.disableGridFitting && (
          <GsRow label="instCtrl" value="no-grid-fit" />
        )}
        {gs.instructControl.ignoreCvtParams && (
          <GsRow label="instCtrl" value="ignore-cvt" />
        )}
      </div>
    </div>
  )
}

function GsRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={styles.gsRow}>
      <span className={styles.gsLabel}>{label}</span>
      <span className={styles.gsValue}>{value}</span>
    </div>
  )
}
