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
import { mat, Vector } from 'otfjs/util'

import { usePrevious } from '../../hooks/use-previous'
import { relativeMouse } from '../../utils/event'

import styles from './glyph-editor.module.css'

export function GlyphEditor({ glyph }: { glyph: GlyphSimple }) {
  const ref = useRef<SVGSVGElement>(null)
  const size = useSize(ref)

  const center = useMemo(() => centeredMatrix(glyph, size), [glyph, size])
  const matrix = useMatrix(ref as any, center)

  const x = matrix.dx
  const y = matrix.dy
  const sx = matrix.xx
  const sy = matrix.yy

  const d = glyphToSvgPath(glyph)

  const canvas = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return

      const box = canvas.getBoundingClientRect()
      canvas.width = 12
      canvas.height = (box.height * 12) / box.width

      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="f" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncA type="discrete" tableValues="0 1"/></feComponentTransfer></filter></svg>#f')`
      const scale = 12 / (glyph.xMax - glyph.xMin)
      ctx.scale(scale, scale)
      ctx.transform(1, 0, 0, -1, 0, glyph.yMax)
      renderGlyphToCanvas(glyph, ctx)
      ctx.fill()
    },
    [glyph],
  )

  return (
    <>
      <canvas ref={canvas} className={styles.canvas} />
      <svg
        className={styles.editor}
        ref={ref}
        viewBox={`${x} ${y} ${size.x * sx} ${size.y * sy}`}
        fill="none"
      >
        <g transform={`matrix(1 0 0 -1 0 ${glyph.yMax})`}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={glyph.yMax}
            stroke="red"
            strokeWidth={sx / 2}
          />
          <line
            x1={0}
            y1={0}
            x2={glyph.xMax}
            stroke="red"
            strokeWidth={sx / 2}
          />
          <circle cx={0} cy={0} r={4 * sx} fill="blue" />
          <path d={d} stroke="black" strokeWidth={sx} />
          {glyph.points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={p.onCurve ? 4 * sx : 3 * sx}
              fill={p.onCurve ? 'black' : 'none'}
              strokeWidth={2 * sx}
              stroke={p.onCurve ? undefined : 'black'}
            />
          ))}
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

function useMatrix(ref: RefObject<HTMLElement>, defaultMatrix = mat.IDENTITY) {
  const [matrix, setMatrix] = useState(defaultMatrix)
  const lastDefault = usePrevious(defaultMatrix)

  useEffect(() => {
    if (lastDefault && mat.equals(lastDefault, matrix)) {
      setMatrix(defaultMatrix)
    }
  }, [defaultMatrix, lastDefault, matrix])

  useEffect(() => {
    ref.current!.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()

        const { deltaX, deltaY, ctrlKey } = e

        if (ctrlKey) {
          // zoom
          const mouse = relativeMouse(e, e.currentTarget! as HTMLElement)

          setMatrix((m) => {
            const p2 = mat.transformPoint(mouse, m)!
            return mat.mult(
              m,
              mat.translate(-p2.x, -p2.y),
              mat.scale(1 + deltaY / 100),
              mat.translate(p2.x, p2.y),
            )
          })
        } else {
          // pan
          setMatrix((m) => mat.mult(mat.translate(deltaX / 2, deltaY / 2), m))
        }
      },
      { passive: false },
    )
  }, [ref])

  return matrix
}

const MARGIN = 32

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
