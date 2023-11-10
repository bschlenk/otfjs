import { Font, glyphToSvgPath } from 'otfjs'
import styles from './font-view.module.css'
import { JSXElementConstructor, useMemo, useState } from 'react'
import clsx from 'clsx'

interface FontViewProps {
  font: ArrayBuffer
}

export function FontView(props: FontViewProps) {
  const font = useMemo(() => new Font(props.font), [props.font])
  const [tag, setTag] = useState(() =>
    font.tables.includes('head') ? 'head' : font.tables[0],
  )

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
    <div style={{ padding: '16px 8px' }}>
      <a href={url} target="_blank" rel="noreferrer">
        {url}
      </a>
    </div>
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
  const svgs: JSX.Element[] = []

  let i = 0
  for (const glyph of font.glyphs()) {
    if (!glyph.points) {
      ++i
      continue
    }

    const width = glyph.xMax - glyph.xMin
    const height = glyph.yMax - glyph.yMin

    const d = glyphToSvgPath(glyph, glyph.yMax)

    svgs.push(
      <svg
        data-glyph-index={i++}
        height="100"
        viewBox={`0 0 ${width} ${height}`}
        style={{ overflow: 'visible' }}
      >
        <path d={d} fill="currentcolor" />
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
