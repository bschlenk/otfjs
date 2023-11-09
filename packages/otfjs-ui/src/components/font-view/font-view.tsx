import { Font, Glyph } from 'otfjs'
import styles from './font-view.module.css'
import { JSXElementConstructor, useMemo, useState } from 'react'
import clsx from 'clsx'

interface FontViewProps {
  font: ArrayBuffer
}

export function FontView(props: FontViewProps) {
  const font = useMemo(() => new Font(props.font), [props.font])
  const [tag, setTag] = useState('head')

  const TableComponent = TABLE_MAP[tag] ?? null

  return (
    <div className={styles.wrapper}>
      <div className={styles.tablesList}>
        <ul>
          {font.tables.map((table) => (
            <li key={table}>
              <button
                className={clsx({ [styles.active]: tag === table })}
                onClick={() => setTag(table)}
              >
                {TABLE_MAP[table] ? table : '🚧 ' + table}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.tableView}>
        <DocLink tag={tag} />
        {TableComponent && <TableComponent font={font} />}
      </div>
    </div>
  )
}

function DocLink({ tag }: { tag: string }) {
  const url = `https://learn.microsoft.com/en-us/typography/opentype/spec/${tag}`
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {url}
    </a>
  )
}

function JsonView({
  data,
  replacements,
}: {
  data: unknown
  replacements?: Record<string, (value: unknown) => any>
}) {
  const replacer = useMemo(() => {
    if (!replacements) return undefined

    return (key: string, value: any) => {
      const r = replacements[key]
      if (r) return r(value)
      return value
    }
  }, [replacements])

  return <pre>{JSON.stringify(data, replacer, 2)}</pre>
}

function jsonView(
  tag: string,
  replacements?: Record<string, (value: unknown) => any>,
) {
  return ({ font }: { font: Font }) => {
    const table = font.getTable(tag)
    return <JsonView data={table} replacements={replacements} />
  }
}

function CmapView({ font }: { font: Font }) {
  const [chars, setChars] = useState('')

  const table = font.getTable('cmap')
  const glyphIndices: [string, number][] = []

  for (const char of chars) {
    const codePoint = char.codePointAt(0)!
    const glyphIndex = table.getGlyphIndex(0, 3, codePoint)
    glyphIndices.push([char, glyphIndex])
  }

  return (
    <div className={styles.cmapTable}>
      <JsonView
        data={{
          version: table.version,
          encodingRecords: table.encodingRecords,
        }}
      />
      <input value={chars} onChange={(e) => setChars(e.target.value)} />
      {glyphIndices.map(([char, glyphIndex], i) => (
        <span key={i}>
          {char}: {glyphIndex}
        </span>
      ))}
    </div>
  )
}

function GlyfView({ font }: { font: Font }) {
  // ok let's draw these glyphs! i think what we want is a viewbox that's
  // based on the xmin/max stuff, and then turn the whole thing into an svg
  // path command. let's start with just the glyphs where all points are onCurve

  const svgs: JSX.Element[] = []

  /*
  const glyphA = font.getGlyph(2)

  let sx = Infinity
  let sy = Infinity
  let bx = -Infinity
  let by = -Infinity

  const shapes: JSX.Element[] = glyphA.points.map((p, i) => {
    sx = Math.min(sx, p.x)
    sy = Math.min(sy, p.y)
    bx = Math.max(bx, p.x)
    by = Math.max(by, p.y)

    return (
      <circle
        key={i}
        cx={p.x}
        cy={p.y}
        r={p.onCurve ? 100 : 200}
        fill={p.onCurve ? 'red' : 'blue'}
      />
    )
  })

  const width = glyphA.xMax - glyphA.xMin
  const height = glyphA.yMax - glyphA.yMin

  svgs.push(
    <svg
      width="100"
      viewBox={`${glyphA.xMin} ${glyphA.yMin} ${width} ${height}`}
    >
      {shapes}
    </svg>,
  )
  */

  let i = 0
  for (const glyph of font.glyphs()) {
    if (!glyph.points) {
      ++i
      continue
    }

    const width = glyph.xMax - glyph.xMin
    const height = glyph.yMax - glyph.yMin

    let d = ''

    // you can have 2 off curve points in a row, and the midpoint will be
    // implied, so we need to make sure we handle this

    let first = true
    let cStart = glyph.points[0]
    for (let i = 0; i < glyph.points.length; ++i) {
      const { x, y, onCurve } = glyph.points[i]
      const isEnd = glyph.endPtsOfContours.includes(i)

      if (first) {
        // assuming the first point can't be off the curve but let's see
        if (!onCurve) throw new Error('first point is off the curve')
        d += `M${x} ${y}`
        cStart = glyph.points[i]
        first = false
        continue
      }

      if (onCurve) {
        d += `L${x} ${y}`

        if (isEnd) {
          d += `L${cStart.x} ${cStart.y}`
          first = true
        }
      } else {
        const next = glyph.points[i + 1]
        d += `Q${x} ${y} `

        if (isEnd) {
          // the last point
          d += `${cStart.x} ${cStart.y}`
          first = true
        } else if (next.onCurve) {
          d += `${next.x} ${next.y}`
          ++i
        } else {
          // implied by the midpoint
          d += `${(x + next.x) / 2} ${(y + next.y) / 2}`
        }
      }
    }

    svgs.push(
      <svg
        data-glyph-index={i++}
        height="100"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <g transform={`matrix(1 0 0 -1 0 ${glyph.yMax})`}>
          <path d={d} fill="white" />
        </g>
      </svg>,
    )
  }

  return <div>{svgs}</div>
}

const TABLE_MAP: Record<string, JSXElementConstructor<{ font: Font }>> = {
  cmap: CmapView,
  glyf: GlyfView,
  head: jsonView('head'),
  maxp: jsonView('maxp', { version: toHex }),
  loca: jsonView('loca'),
  name: jsonView('name'),
}

function toHex(n: unknown) {
  if (typeof n !== 'number') return n
  return `0x${n.toString(16).padStart(8, '0')}`
}
