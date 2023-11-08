import { CmapTable, Font } from 'otfjs'
import styles from './font-view.module.css'
import { JSXElementConstructor, useMemo, useState } from 'react'
import clsx from 'clsx'

interface FontViewProps {
  font: ArrayBuffer
}

export function FontView(props: FontViewProps) {
  const font = useMemo(() => new Font(props.font), [props.font])
  const [tag, setTag] = useState('head')

  const table = font.getTable(tag)

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
        <TableComponent table={table} />
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

function JsonView({ table }: { table: unknown }) {
  return <pre>{JSON.stringify(table, null, 2)}</pre>
}

function CmapView({ table }: { table: CmapTable }) {
  const [chars, setChars] = useState('')

  const glyphIndices: [string, number][] = []

  for (const char of chars) {
    const codePoint = char.codePointAt(0)!
    const glyphIndex = table.getGlyphIndex(0, 3, codePoint)
    glyphIndices.push([char, glyphIndex])
  }

  return (
    <div className={styles.cmapTable}>
      <JsonView
        table={{
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

const TABLE_MAP: Record<string, JSXElementConstructor<{ table: any }>> = {
  cmap: CmapView,
  head: JsonView,
  name: JsonView,
}
