import { createElement, type JSX, type ReactElement, useState } from 'react'
import clsx from 'clsx'
import {
  Font,
  GlyfSimple,
  Glyph,
  glyphToColorSvg,
  type Node as SvgNode,
} from 'otfjs'
import { CpalTable } from 'otfjs/tables/cpal'

import { GlyphEditor } from './glyph-editor'
import { HintingDebug } from './hinting-debug'
import { HintingView } from './hinting-view'

import glyfStyles from './glyf-view.module.css'

type GlyfMode = 'outline' | 'hinting' | 'debug'

export function GlyfView({ font }: { font: Font }) {
  const [glyfId, setGlyfId] = useState<number | null>(null)
  const [mode, setMode] = useState<GlyfMode>('hinting')

  const head = font.getTable('head')

  if (glyfId === null) {
    return <AllGlyfView font={font} onClick={(i) => setGlyfId(i)} />
  }

  const glyph = font.getGlyph(glyfId) as GlyfSimple

  return (
    <div className={glyfStyles.glyphDetail}>
      <div className={glyfStyles.glyphDetailHeader}>
        <button
          className={glyfStyles.backButton}
          onClick={() => setGlyfId(null)}
        >
          ← Back
        </button>
        <div className={glyfStyles.modeTabs}>
          <button
            className={clsx(glyfStyles.modeTab, {
              [glyfStyles.modeTabActive]: mode === 'outline',
            })}
            onClick={() => setMode('outline')}
          >
            Outline
          </button>
          <button
            className={clsx(glyfStyles.modeTab, {
              [glyfStyles.modeTabActive]: mode === 'hinting',
            })}
            onClick={() => setMode('hinting')}
          >
            Hinting
          </button>
          <button
            className={clsx(glyfStyles.modeTab, {
              [glyfStyles.modeTabActive]: mode === 'debug',
            })}
            onClick={() => setMode('debug')}
          >
            Debug
          </button>
        </div>
      </div>

      <div className={glyfStyles.glyphDetailBody}>
        {mode === 'outline' ?
          <GlyphEditor glyph={glyph} upem={head.unitsPerEm} />
        : mode === 'hinting' ?
          <HintingView font={font} glyphId={glyfId} onGlyphChange={setGlyfId} />
        : <HintingDebug
            font={font}
            glyphId={glyfId}
            onGlyphChange={setGlyfId}
          />
        }
      </div>
    </div>
  )
}

export function AllGlyfView({
  font,
  onClick,
}: {
  font: Font
  onClick: (i: number) => void
}) {
  const [palette, setPalette] = useState(0)

  const svgs: JSX.Element[] = []

  const head = font.getTable('head')
  const cpal = font.getTableOrNull('CPAL')
  const height = head.unitsPerEm

  for (const glyph of font.glyphs()) {
    if (!glyph.points) continue

    svgs.push(
      <button
        key={glyph.id}
        className="bg-transparent p-0"
        onClick={() => onClick(glyph.id)}
      >
        <SvgGlyph glyph={glyph} font={font} height={height} palette={palette} />
      </button>,
    )
  }

  return (
    <GlyfContainer cpal={cpal} palette={palette} setPalette={setPalette}>
      {svgs}
    </GlyfContainer>
  )
}

interface GlyfContainerProps {
  cpal: CpalTable | null
  children: React.ReactNode
  palette: number
  setPalette: (palette: number) => void
}

function GlyfContainer({
  cpal,
  children,
  palette,
  setPalette,
}: GlyfContainerProps) {
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
      {cpal && (
        <label>
          Palette
          <select
            value={palette}
            onChange={(e) => setPalette(+e.currentTarget.value)}
          >
            {Array.from({ length: cpal.numPalettes }, (_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap">{children}</div>
    </div>
  )
}

function SvgGlyph({
  glyph,
  font,
  height,
  palette,
}: {
  glyph: Glyph
  font: Font
  height: number
  palette: number
}) {
  let width = glyph.advanceWidth
  if (width === 0) {
    width = glyph.xMax - glyph.xMin
  }

  const { paths, defs } = glyphToColorSvg(glyph, font, palette)

  return (
    <svg
      className="h-(--glyph-height,100px) overflow-visible fill-current"
      data-glyph-id={glyph.id}
      height="100px"
      viewBox={`0 0 ${width} ${height}`}
    >
      {defs.length > 0 && <defs>{defs.map(nodeToElement)}</defs>}
      <g transform={`matrix(1 0 0 -1 0 ${height})`}>
        {paths.map(nodeToElement)}
      </g>
    </svg>
  )
}

function nodeToElement(node: SvgNode, key: number): ReactElement {
  const props: Record<string, unknown> = { key }
  for (const name in node.props) props[reactPropName(name)] = node.props[name]

  return createElement(node.type, props, ...node.children.map(nodeToElement))
}

/** React wants camelCase SVG attributes, like `stopColor` for `stop-color`. */
function reactPropName(name: string) {
  return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
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
