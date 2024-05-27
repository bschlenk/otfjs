import { useMemo, useState } from 'react'
import { Font, VirtualMachine, glyphToSvgPath } from 'otfjs'

import styles from './glyf-view.module.css'

export function GlyfView({ font }: { font: Font }) {
  const [glyf, setGlyf] = useState<number | null>(null)

  if (!glyf) {
    return <AllGlyfView font={font} onClick={(i) => setGlyf(i)} />
  }

  return (
    <SingleGlyphView font={font} index={glyf} onBack={() => setGlyf(null)} />
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
  const hmtx = font.getTable('hmtx')

  let i = 0

  for (const glyph of font.glyphs()) {
    if (!glyph.points) {
      ++i
      continue
    }

    const { advanceWidth } =
      hmtx.longHorMetrics[i] ??
      hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

    if (advanceWidth === 0) {
      ++i
      continue
    }

    const width = advanceWidth
    const height = head.unitsPerEm // glyph.yMax - glyph.yMin

    const d = glyphToSvgPath(glyph, height)
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
        <path d={d} fill="currentcolor" />
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
  const hmtx = font.getTable('hmtx')

  const vm = useMemo(() => {
    const vm = new VirtualMachine(font)
    vm.runFpgm()
    vm.runPrep()
    vm.setGlyph(glyph)
    return vm
  }, [font, glyph])

  const { advanceWidth } =
    hmtx.longHorMetrics[index] ??
    hmtx.longHorMetrics[hmtx.longHorMetrics.length - 1]

  const width = advanceWidth
  const height = head.unitsPerEm // glyph.yMax - glyph.yMin

  const d = glyphToSvgPath(glyph, height)

  return (
    <div>
      <button onClick={onBack}>Back</button>
      <svg
        className={styles.glyph}
        height="100px"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <path d={d} fill="currentcolor" />
      </svg>
      <div>
        <pre>{JSON.stringify(vm)}</pre>
      </div>
    </div>
  )
}
