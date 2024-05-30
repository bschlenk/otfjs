import { RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GlyphSimple, glyphToSvgPath } from 'otfjs'
import { Matrix } from 'otfjs/util'

import styles from './glyph-editor.module.css'

export function GlyphEditor({ glyph }: { glyph: GlyphSimple }) {
  const ref = useRef<SVGSVGElement>(null)
  const size = useSize(ref)

  const matrix = useMatrix(ref as any)
  const x = matrix.values[4]
  const y = matrix.values[5]
  const sx = matrix.values[0]
  const sy = matrix.values[3]

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
  const [matrix, setMatrix] = useState<Matrix>(() => new Matrix())
  const matrixRef = useRef(matrix)
  matrixRef.current = matrix

  useEffect(() => {
    ref.current!.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()

        const { deltaX, deltaY, ctrlKey } = e
        const m = matrixRef.current

        if (ctrlKey) {
          // zoom

          // get mouse relative to element
          const box = (e.currentTarget! as HTMLElement).getBoundingClientRect()
          const rx = Math.round(e.clientX - box.left)
          const ry = Math.round(e.clientY - box.top)

          const p2 = m.transformPoint({ x: rx, y: ry })!

          setMatrix(
            m
              .translate(-p2.x, -p2.y)
              .scale(1 + deltaY / 100)
              .translate(p2.x, p2.y),
          )
        } else {
          // pan
          setMatrix(m.preTranslate(deltaX, deltaY))
        }
      },
      { passive: false },
    )
  }, [ref])

  return matrix
}
