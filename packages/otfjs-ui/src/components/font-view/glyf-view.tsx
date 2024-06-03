import { useState } from 'react'
import { Font, glyphToSvgPath } from 'otfjs'

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
      <button className={styles.backButton} onClick={() => setGlyf(null)}>
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
        <g transform={`matrix(1 0 0 -1 0 ${height})`}>
          <path d={d} fill="currentcolor" />
        </g>
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
      <div className={styles.view}>{children}</div>
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
