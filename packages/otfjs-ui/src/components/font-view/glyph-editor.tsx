import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlyphSimple, glyphToSvgPath } from 'otfjs'
import { mat } from 'otfjs/util'

import { relativeMouse } from '../../utils/event'

import styles from './glyph-editor.module.css'

export function GlyphEditor({ glyph }: { glyph: GlyphSimple }) {
  const ref = useRef<SVGSVGElement>(null)
  const size = useSize(ref)

  const matrix = useMatrix(ref as any)
  const x = matrix.dx
  const y = matrix.dy
  const sx = matrix.xx
  const sy = matrix.yy

  const d = glyphToSvgPath(glyph, 16)

  return (
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
        <line x1={0} y1={0} x2={glyph.xMax} stroke="red" strokeWidth={sx / 2} />
        <circle cx={0} cy={0} r={4 * sx} fill="blue" />
        <path d={d} stroke="black" strokeWidth={sx} />
        {glyph.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4 * sx}
            fill={p.onCurve ? 'black' : 'none'}
            stroke="black"
          />
        ))}
      </g>
    </svg>
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
  })

  return size
}

function useMatrix(ref: RefObject<HTMLElement>) {
  const [matrix, setMatrix] = useState(mat.IDENTITY)

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
          setMatrix((m) => mat.mult(mat.translate(deltaX, deltaY), m))
        }
      },
      { passive: false },
    )
  }, [ref])

  return matrix
}
