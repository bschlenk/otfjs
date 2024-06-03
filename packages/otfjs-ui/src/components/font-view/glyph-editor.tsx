import {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GlyphSimple, glyphToSvgPath, renderGlyphToCanvas } from 'otfjs'
import { vec } from 'otfjs/util'

import { usePrevious } from '../../hooks/use-previous'
import { relativeMouse } from '../../utils/event'

import styles from './glyph-editor.module.css'

export function GlyphEditor({
  glyph,
  ppem,
}: {
  glyph: GlyphSimple
  ppem: number
}) {
  const ref = useRef<SVGSVGElement>(null)
  const size = useSize(ref)

  // const center = useMemo(() => centeredMatrix(glyph, size), [glyph, size])
  const { origin, scale: s } = useOriginScale(ref as any /*, center */)
  const s2 = 16 / ppem

  const x = origin.x
  const y = origin.y

  const d = glyphToSvgPath(glyph)

  const gCanvas = useMemo(
    () => renderGlyph(glyph, { scale: s2, antialias: false }),
    [glyph, s2],
  )

  const canvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return

      canvas.width = size.x
      canvas.height = size.y

      const ctx = canvas.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.transform(s / s2, 0, 0, s / s2, x, y)

      ctx.globalAlpha = 0.75
      ctx.drawImage(gCanvas, 0, 0)

      // for each px, clear a 1px line so we can see the individual pixels
      for (let i = 0; i < gCanvas.width; ++i) {
        ctx.clearRect(i, 0, (1 * s2) / s, gCanvas.height)
      }

      for (let i = 0; i < gCanvas.height; ++i) {
        ctx.clearRect(0, i, gCanvas.width, (1 * s2) / s)
      }
    },
    [gCanvas, s, s2, size, x, y],
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
              y2={glyph.yMax}
              stroke="red"
              strokeWidth={0.5 / s}
            />
            <line
              x1={0}
              y1={0}
              x2={glyph.xMax}
              stroke="red"
              strokeWidth={0.5 / s}
            />
            <circle cx={0} cy={0} r={4 / s} fill="blue" />
            <path d={d} stroke="var(--color-icon)" strokeWidth={1 / s} />
            {glyph.points.map((p, i) => (
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

const DEFAULT = { origin: { x: 0, y: 0 }, scale: 1 }

function useOriginScale(
  ref: RefObject<HTMLElement>,
  defaultOriginScale = DEFAULT,
) {
  const [originScale, setOriginScale] = useState(defaultOriginScale)
  const lastDefault = usePrevious(defaultOriginScale)

  useEffect(() => {
    if (
      lastDefault &&
      vec.equals(lastDefault.origin, originScale.origin) &&
      lastDefault.scale === originScale.scale
    ) {
      setOriginScale(defaultOriginScale)
    }
  }, [defaultOriginScale, lastDefault, originScale])

  useEffect(() => {
    ref.current!.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()

        const { deltaX, deltaY, ctrlKey } = e

        if (ctrlKey) {
          // zoom
          const mouse = relativeMouse(e, e.currentTarget! as HTMLElement)

          setOriginScale((value) => {
            const scaleBy = 1 - deltaY / 100

            const origin = vec.subtract(
              mouse,
              vec.scale(vec.subtract(mouse, value.origin), scaleBy),
            )
            const scale = value.scale * scaleBy

            return { origin, scale }
          })
        } else {
          // pan
          setOriginScale((value) => {
            return {
              ...value,
              origin: vec.add(value.origin, { x: -deltaX / 2, y: -deltaY / 2 }),
            }
          })
        }
      },
      { passive: false },
    )
  }, [ref])

  return originScale
}

// const MARGIN = 32

/*
function centeredMatrix(glyph: GlyphSimple, size: Vector) {
  const { xMin, xMax, yMin, yMax } = glyph
  const width = xMax - xMin
  const height = yMax - yMin

  const sw = size.x - MARGIN * 2
  const sh = size.y - MARGIN * 2

  const sx = sw / width
  const sy = sh / height
  const s = 1 / Math.min(sx, sy)

  let x = 0
  let y = 0

  if (sy > sx) {
    x = xMin - MARGIN * s
    y = -(size.y * s - height) / 2
  } else {
    x = -(size.x * s - width) / 2
    y = yMin - MARGIN * s
  }

  return mat.mat(s, 0, 0, s, x, y)
}
*/

const FILTER_ANTI_ALIAS = `url('data:image/svg+xml,\
<svg xmlns="http://www.w3.org/2000/svg">\
<filter id="f" color-interpolation-filters="sRGB">\
<feComponentTransfer>\
<feFuncA type="discrete" tableValues="0 0 0 1"/>\
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

  canvas.width = Math.ceil(gWidth * scale)
  canvas.height = Math.ceil(gHeight * scale)

  const ctx = canvas.getContext('2d')!

  if (!antialias) {
    ctx.filter = FILTER_ANTI_ALIAS
  }

  ctx.scale(scale, scale)
  ctx.transform(1, 0, 0, -1, 0, glyph.yMax)
  renderGlyphToCanvas(glyph, ctx)
  ctx.fill()

  return canvas
}
