import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as vec from '@bschlenk/vec'
import { GlyphSimple, glyphToSvgPath, renderGlyphToCanvas } from 'otfjs'

import { useOriginScale } from '../../hooks/use-origin-scale'

import styles from './glyph-editor.module.css'

export interface GlyphEditorProps {
  glyph: GlyphSimple
  upem: number
}

export function GlyphEditor({ glyph, upem }: GlyphEditorProps) {
  const ref = useRef<SVGSVGElement>(null)
  const size = useSize(ref)

  const center = useMemo(
    () => centeredGlyph(glyph, size, upem),
    [glyph, size, upem],
  )
  const { origin, scale: s } = useOriginScale(
    ref as unknown as React.RefObject<HTMLElement>,
    center,
  )
  const gScale = 16 / upem

  const x = origin.x
  const y = origin.y

  const d = glyphToSvgPath(glyph)

  const [gCanvas, gOffset] = useMemo(
    () => renderGlyph(glyph, { scale: gScale, antialias: true }),
    [glyph, gScale],
  )

  const canvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return

      const dpi = window.devicePixelRatio

      canvas.width = size.x * dpi
      canvas.height = size.y * dpi

      const ox = gOffset.x
      const oy = gOffset.y

      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.scale(dpi, dpi)
      ctx.transform(s / gScale, 0, 0, -s / gScale, x, y + glyph.yMax * s)

      ctx.globalAlpha = 0.75
      ctx.drawImage(gCanvas, ox, oy)

      if (s < 0.075) return

      // for each px, clear a 1px line so we can see the individual pixels
      for (let i = 1; i < gCanvas.width; ++i) {
        ctx.clearRect(i + ox, 0, gScale / s, gCanvas.height + oy)
      }

      for (let i = 1; i < gCanvas.height; ++i) {
        ctx.clearRect(0, i + oy, gCanvas.width + ox, gScale / s)
      }
    },
    [size, gOffset, s, gScale, x, y, glyph.yMax, gCanvas],
  )

  return (
    <>
      <canvas ref={canvas} className={styles.canvas} />
      <svg
        className={styles.editor}
        ref={ref}
        viewBox={`0 0 ${size.x} ${size.y}`}
        fill="none"
      >
        <g transform={`matrix(${s} 0 0 ${s} ${x} ${y})`}>
          <g transform={`matrix(1 0 0 -1 0 ${glyph.yMax})`}>
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={upem}
              stroke="red"
              strokeWidth={0.5 / s}
            />
            <line x1={0} y1={0} x2={upem} stroke="red" strokeWidth={0.5 / s} />
            {s >= 0.075 && <circle cx={0} cy={0} r={4 / s} fill="blue" />}
            {s >= 0.075 && (
              <path d={d} stroke="var(--color-icon)" strokeWidth={1 / s} />
            )}
            {s >= 0.075 &&
              glyph.points.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={p.onCurve ? 4 / s : 3 / s}
                  fill={p.onCurve ? 'var(--color-icon)' : 'none'}
                  strokeWidth={2 / s}
                  stroke={p.onCurve ? undefined : 'var(--color-icon)'}
                />
              ))}
          </g>
        </g>
      </svg>
    </>
  )
}

function useSize(ref: RefObject<Element>) {
  const [size, setSize] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    const { clientWidth, clientHeight } = ref.current!
    setSize({ x: clientWidth, y: clientHeight })
  }, [ref])

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setSize({ x: width, y: height })
    })

    observer.observe(ref.current!)

    return () => observer.disconnect()
  }, [ref])

  return size
}

const MARGIN = 32

function centeredGlyph(glyph: GlyphSimple, size: vec.Vector, upem: number) {
  const left = Math.min(0, glyph.xMin)
  const right = Math.max(upem, glyph.xMax)
  const top = Math.max(upem, glyph.yMax)
  const bottom = Math.min(0, glyph.yMin)

  const width = right - left
  const height = top - bottom

  const sw = size.x - MARGIN * 2
  const sh = size.y - MARGIN * 2

  const sx = sw / width
  const sy = sh / height
  const s = Math.min(sx, sy)

  let x = 0
  let y = 0

  if (sy > sx) {
    x = MARGIN
    y = (size.y - height * s) / 2 - top * s
  } else {
    x = (size.x - width * s) / 2 - left * s
    y = MARGIN + (upem - glyph.yMax) * s
  }

  return { origin: { x, y }, scale: s }
}

const FILTER_ANTI_ALIAS = `url('data:image/svg+xml,\
<svg xmlns="http://www.w3.org/2000/svg">\
<filter id="f" color-interpolation-filters="sRGB">\
<feComponentTransfer>\
<feFuncA type="discrete" tableValues="0 0 0 0 0 1 1 1"/>\
</feComponentTransfer>\
</filter>\
</svg>#f')`

interface RenderGlyphOptions {
  scale?: number
  antialias?: boolean
}

function renderGlyph(
  glyph: GlyphSimple,
  { scale = 1, antialias = false }: RenderGlyphOptions,
) {
  const canvas = document.createElement('canvas')

  const gWidth = glyph.xMax - glyph.xMin
  const gHeight = glyph.yMax - glyph.yMin

  canvas.width = Math.ceil(gWidth * scale) + 2
  canvas.height = Math.ceil(gHeight * scale) + 2

  const ctx = canvas.getContext('2d')!

  if (!antialias) {
    ctx.filter = FILTER_ANTI_ALIAS
  }

  const ox = -Math.floor(glyph.xMin * scale) + 1
  const oy = -Math.floor(glyph.yMin * scale) + 1

  ctx.transform(scale, 0, 0, scale, ox, oy)

  renderGlyphToCanvas(glyph, ctx)
  ctx.fill()

  return [canvas, { x: -ox, y: -oy }] as const
}
