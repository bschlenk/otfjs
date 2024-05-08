import { useState } from 'react'
import { Font, glyphToSvgPath } from 'otfjs'

import styles from './glyf-view.module.css'

export function GlyfView({ font }: { font: Font }) {
  const svgs: JSX.Element[] = []

  const head = font.getTable('head')
  const hmtx = font.getTable('hmtx')

  let i = 0
  let skipped = 0

  for (const glyph of font.glyphs()) {
    if (!glyph.points) {
      ++i
      ++skipped
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

    svgs.push(
      <svg
        key={i}
        className={styles.glyph}
        onClick={() => console.log(glyph)}
        data-glyph-index={i++}
        height="100px"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <path d={d} fill="currentcolor" />
      </svg>,
    )
  }

  console.log('skipped', skipped)

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
