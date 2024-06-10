import { cloneElement, useState } from 'react'
import { Extend, Font, glyphToSvgPath } from 'otfjs'
import { vec } from 'otfjs/util'

import { GlyphEditor } from './glyph-editor'

import styles from './glyf-view.module.css'

export function GlyfView({ font }: { font: Font }) {
  const [glyf, setGlyf] = useState<number | null>(null)
  const head = font.getTable('head')

  if (!glyf) {
    return <AllGlyfView font={font} onClick={(i) => setGlyf(i)} />
  }

  return (
    <>
      <GlyphEditor glyph={font.getGlyph(glyf)} ppem={head.unitsPerEm} />
      <button className="absolute" onClick={() => setGlyf(null)}>
        Back
      </button>
    </>
  )
}

export function AllGlyfView({
  font,
  onClick,
}: {
  font: Font
  onClick: (i: number) => void
}) {
  const svgs: JSX.Element[] = []

  const head = font.getTable('head')
  const colr = font.getTableOrNull('COLR')

  let i = 0

  for (const glyph of font.glyphs()) {
    if (!glyph.points) {
      ++i
      continue
    }

    if (glyph.advanceWidth === 0) {
      ++i
      continue
    }

    const width = glyph.advanceWidth
    const height = head.unitsPerEm // glyph.yMax - glyph.yMin

    const d = glyphToSvgPath(glyph)
    const idx = i

    const defs: any = []
    let path: any = []

    if (
      !colr?.colorGlyph(i, {
        paintGlyph(glyphId) {
          const g = font.getGlyph(glyphId)
          const d = glyphToSvgPath(g)
          path.push(<path d={d} fill="currentcolor" />)
        },
        paintSolid(paletteIndex: number, alpha: number) {
          const c = font.getTable('CPAL').getPalette(0)[paletteIndex]
          path[path.length - 1] = cloneElement(path[path.length - 1], {
            fill: `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a * alpha})`,
          })
        },
        paintLinearGradient(p0, p1, p2, extend, stops) {
          const spreadMethod = (() => {
            switch (extend) {
              case Extend.PAD:
                return 'pad'
              case Extend.REFLECT:
                return 'reflect'
              case Extend.REPEAT:
                return 'repeat'
            }
          })()

          const palette = font.getTable('CPAL').getPalette(0)

          const stopsEls = stops.map((stop, i) => {
            const c = palette[stop.paletteIndex]
            return (
              <stop
                key={i}
                offset={stop.stopOffset}
                stopColor={`rgb(${c.r} ${c.g} ${c.b} / ${c.a * stop.alpha})`}
              />
            )
          })

          const id = `gradient-${idx}-${defs.length}`

          const p3 = vec.add(
            p0,
            vec.projectOnto(
              vec.subtract(p1, p0),
              vec.rotate90(vec.subtract(p2, p0)),
            ),
          )

          defs.push(
            <linearGradient
              key={defs.length}
              id={id}
              x1={p0.x}
              y1={p0.y}
              x2={p3.x}
              y2={p3.y}
              spreadMethod={spreadMethod}
              gradientUnits="userSpaceOnUse"
            >
              {stopsEls}
            </linearGradient>,
          )

          path[path.length - 1] = cloneElement(path[path.length - 1], {
            fill: `url('#${id}')`,
          })
        },
      })
    ) {
      path = [<path d={d} fill="currentcolor" />]
    }

    svgs.push(
      <svg
        onClick={() => onClick(idx)}
        key={idx}
        className={styles.glyph}
        data-glyph-index={i++}
        height="100px"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        {defs.length > 0 && <defs>{defs}</defs>}
        <g transform={`matrix(1 0 0 -1 0 ${height})`}>{path}</g>
      </svg>,
    )
  }

  return <GlyfContainer>{svgs}</GlyfContainer>
}

function GlyfContainer({ children }: React.PropsWithChildren) {
  const [scale, setScale] = useState(60)
  return (
    <div style={{ '--glyph-height': `${scale}px` }}>
      <input
        type="range"
        min="8"
        max="200"
        value={scale}
        onChange={(e) => setScale(+e.target.value)}
      />
      <div className="flex flex-wrap">{children}</div>
    </div>
  )
}

/*
function SingleGlyphView({
  font,
  index,
  onBack,
}: {
  font: Font
  index: number
  onBack: () => void
}) {
  const glyph = useMemo(() => font.getGlyph(index), [font, index])

  const head = font.getTable('head')

  const vm = useMemo(() => {
    const vm = new VirtualMachine(font)
    vm.runFpgm()
    vm.runPrep()
    vm.setGlyph(glyph)
    vm.runGlyph()
    return vm
  }, [font, glyph])

  const hintedGlyph = useMemo(() => vm.getGlyph(), [vm])

  const width = glyph.advanceWidth
  const height = head.unitsPerEm // glyph.yMax - glyph.yMin

  const m = mat.mat(1, 0, 0, -1, 0, height)

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <div className={styles.glyphCompare}>
        <svg
          className={styles.glyph}
          height="100px"
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: 'visible' }}
          fill="none"
        >
          <path d={glyphToSvgPath(glyph, height)} stroke="currentcolor" />
          {glyph.points.map((point, i) => {
            const p = mat.transformPoint(point, m)
            const props =
              point.onCurve ?
                { r: 3, fill: 'black' }
              : { r: 2, strokeWidth: 2, stroke: 'black' }
            return <circle key={i} cx={p.x} cy={p.y} {...props} />
          })}
        </svg>
        <svg
          className={styles.glyph}
          height="100px"
          viewBox={`0 0 ${width} ${height}`}
          style={{ overflow: 'visible' }}
          fill="none"
        >
          <path d={glyphToSvgPath(hintedGlyph, height)} stroke="currentcolor" />
          {glyph.points.map((point, i) => {
            const p = m.transformPoint(point)
            const props =
              point.onCurve ?
                { r: 10, fill: 'black' }
              : { r: 8, strokeWidth: 4, stroke: 'black' }
            return <circle key={i} cx={p.x} cy={p.y} {...props} />
          })}
        </svg>
      </div>
      <details>
        <summary>Virtual Machine</summary>
        <pre>{JSON.stringify(vm, null, 2)}</pre>
      </details>
    </div>
  )
}
*/
