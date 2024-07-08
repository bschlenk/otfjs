import { createElement, Fragment, useState } from 'react'
import * as mat from '@bschlenk/mat'
import * as vec from '@bschlenk/vec'
import {
  ColorLayer,
  ColorRecordType,
  ColrTable,
  CompositeMode,
  CpalTable,
  Extend,
  Font,
  GlyphEnriched,
  glyphToSvgPath,
} from 'otfjs'

import { rgbaToCss } from '../../utils/color'
import { GlyphEditor } from './glyph-editor'

export function GlyfView({ font }: { font: Font }) {
  const [glyf, setGlyf] = useState<number | null>(null)
  const head = font.getTable('head')

  if (!glyf) {
    return <AllGlyfView font={font} onClick={(i) => setGlyf(i)} />
  }

  return (
    <>
      <GlyphEditor glyph={font.getGlyph(glyf)} upem={head.unitsPerEm} />
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
  const [palette, setPalette] = useState(0)

  const svgs: JSX.Element[] = []

  const head = font.getTable('head')
  const colr = font.getTableOrNull('COLR')
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
        <SvgGlyph
          glyph={glyph}
          font={font}
          height={height}
          colr={colr}
          palette={palette}
        />
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
  colr,
  palette: paletteIdx,
}: {
  glyph: GlyphEnriched
  font: Font
  height: number
  colr: ColrTable | null
  palette: number
}) {
  let width = glyph.advanceWidth
  if (width === 0) {
    width = glyph.xMax - glyph.xMin
  }

  const defs: any = []
  let path: any = []

  const tree = colr?.colorGlyph(glyph.id)

  if (tree) {
    // visit a node
    // maybe push a new latest record
    // some nodes just update props on the latest record
    // some nodes push their own latest record
    // when done, they need to pop and convert to jsx

    const palette = font.getTable('CPAL').getPalette(paletteIdx)
    const stack: any[] = [{ type: Fragment, props: {}, children: [] }]
    let latest = stack[0]
    let matrix: mat.Matrix | null = null
    let key = 0

    const getColor = (paletteIndex: number, alpha: number) => {
      if (paletteIndex === 0xffff) return 'currentcolor'
      return rgbaToCss(palette[paletteIndex], alpha)
    }

    const push = (): any => {
      const el = { type: 'path', props: { key: key++ }, children: [] }
      stack.push(el)
      latest = el
      return el
    }

    const popOnly = () => {
      const el = stack.pop()
      latest = stack[stack.length - 1]

      if (el.type === 'path' && !el.props.d) {
        // make this a full size rect
        el.type = 'rect'
        Object.assign(el.props, { x: 0, y: 0, width, height })
      }

      return createElement(el.type, el.props, el.children)
    }

    const pop = () => {
      const el = popOnly()
      latest.children.push(el)
    }

    const walk = (layer: ColorLayer) => {
      switch (layer.format) {
        case ColorRecordType.SOLID: {
          const { paletteIndex, alpha } = layer.props
          latest.props.fill = getColor(paletteIndex, alpha)
          break
        }

        case ColorRecordType.LINEAR_GRADIENT: {
          const { p0, p1, p2, extend, stops } = layer.props
          const spreadMethod = extendToSpreadMethod(extend)

          const stopsEls = stops.map((stop, i) => (
            <stop
              key={i}
              offset={stop.stopOffset}
              stopColor={getColor(stop.paletteIndex, stop.alpha)}
            />
          ))

          const id = `${glyph.id}-gradient-${defs.length}`

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
              gradientTransform={matrix ? mat.toSvg(matrix) : undefined}
              spreadMethod={spreadMethod}
              gradientUnits="userSpaceOnUse"
            >
              {stopsEls}
            </linearGradient>,
          )

          matrix = null
          latest.props.fill = `url('#${id}')`
          break
        }

        case ColorRecordType.RADIAL_GRADIENT: {
          const { p0, p1, r0, r1, extend, stops } = layer.props
          const spreadMethod = extendToSpreadMethod(extend)

          const stopsEls = stops.map((stop, i) => (
            <stop
              key={i}
              offset={stop.stopOffset}
              stopColor={getColor(stop.paletteIndex, stop.alpha)}
            />
          ))

          const id = `${glyph.id}-radial-gradient-${defs.length}`

          defs.push(
            <radialGradient
              key={defs.length}
              id={id}
              fx={p0.x}
              fy={p0.y}
              fr={r0}
              cx={p1.x}
              cy={p1.y}
              r={r1}
              gradientTransform={matrix ? mat.toSvg(matrix) : undefined}
              spreadMethod={spreadMethod}
              gradientUnits="userSpaceOnUse"
            >
              {stopsEls}
            </radialGradient>,
          )

          matrix = null
          latest.props.fill = `url('#${id}')`
          break
        }

        case ColorRecordType.GLYPH: {
          const { glyphId } = layer.props
          const g = font.getGlyph(glyphId)
          const d = glyphToSvgPath(g)

          let hasMatrix = false
          if (matrix) {
            const el = push()
            el.type = 'g'
            el.props.transform = mat.toSvg(matrix)

            hasMatrix = true
            matrix = null
          }

          const el = push()
          el.type = 'path'
          el.props.d = d

          walkAll(layer.children)

          pop()

          if (hasMatrix) pop()

          break
        }

        case ColorRecordType.TRANSFORM: {
          matrix = layer.props.matrix
          walkAll(layer.children)

          break
        }

        case ColorRecordType.COMPOSITE: {
          const { mode, src, dest } = layer.props

          switch (mode) {
            case CompositeMode.SRC_IN: {
              push()
              walkAll(dest)
              const destId = `${glyph.id}-${defs.length}`
              latest.props.id = destId
              latest.props.key = defs.length
              const destEl = popOnly()

              defs.push(destEl)
              const id = `${glyph.id}-${defs.length}`
              defs.push(
                <filter key={defs.length} id={id}>
                  <feImage href={`#${destId}`} x="0" y="0" />
                  <feComposite in="SourceGraphic" operator="in" />
                </filter>,
              )

              const el = push()
              el.type = 'g'
              el.props.style = { filter: `url(#${id})` }
              walkAll(src)
              pop()
              break
            }

            case CompositeMode.SOFT_LIGHT: {
              break
            }

            default:
              break
          }
        }
      }
    }

    const walkAll = (tree: ColorLayer[]) => {
      for (const layer of tree) {
        walk(layer)
      }
    }

    walkAll(tree)

    path = stack[0].children
  } else {
    path = [<path key={0} d={glyphToSvgPath(glyph)} />]
  }

  return (
    <svg
      className="h-[var(--glyph-height,100px)] overflow-visible fill-current"
      data-glyph-id={glyph.id}
      height="100px"
      viewBox={`0 0 ${width} ${height}`}
    >
      {defs.length > 0 && <defs>{defs}</defs>}
      <g transform={`matrix(1 0 0 -1 0 ${height})`}>{path}</g>
    </svg>
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

function extendToSpreadMethod(extend: Extend) {
  switch (extend) {
    case Extend.PAD:
      return 'pad'
    case Extend.REFLECT:
      return 'reflect'
    case Extend.REPEAT:
      return 'repeat'
  }
}
