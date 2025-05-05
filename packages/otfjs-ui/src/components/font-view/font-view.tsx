import { useState } from 'react'
import clsx from 'clsx'
import { Font, NameId } from 'otfjs'

import { useFont } from '../font-context'
import { TABLE_MAP } from './font-view.utils'

import styles from './font-view.module.css'
import {
  FontViewMode,
  FontViewProvider,
  useFontViewState,
} from './font-view-context'
import { Head } from './components/head'

interface FontViewProps {
  font: Font
}

export function FontView({ font }: FontViewProps) {
  const state = useFontViewState()
  const [tag, setTag] = useState(() =>
    font.hasTable('glyf') ? 'glyf'
    : font.hasTable('head') ? 'head'
    : font.tables[0],
  )

  return (
    <FontViewProvider value={state}>
      <div className={styles.root}>
        <Head tag={tag} />
        {state.mode === FontViewMode.Inspect ?
          <InspectMode tag={tag} setTag={setTag} />
        : state.mode === FontViewMode.Type ?
          <TypeMode />
        : null}
      </div>
    </FontViewProvider>
  )
}

function InspectMode({
  tag,
  setTag,
}: {
  tag: string
  setTag: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <>
      <Sidebar tag={tag} setTag={setTag} />
      <TableView tag={tag} />
    </>
  )
}

function TypeMode() {
  const font = useFont()
  const fontFamily = font.getName(NameId.FontFamilyName)

  return (
    <>
      <Sidebar tag="type" setTag={() => {}} />
      <div className={styles.tableView}>
        <textarea
          autoFocus
          defaultValue={fontFamily!}
          style={{ fontFamily }}
          className="block h-full w-full resize-none text-2xl"
        />
      </div>
    </>
  )
}

function Sidebar({
  tag,
  setTag,
}: {
  tag: string
  setTag: React.Dispatch<React.SetStateAction<string>>
}) {
  const font = useFont()

  return (
    <div className={styles.sidebar}>
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
  )
}

function TableView({ tag }: { tag: string }) {
  const font = useFont()
  const TableComponent = TABLE_MAP[tag]

  return (
    <div className={styles.tableView}>
      {TableComponent && <TableComponent font={font} />}
    </div>
  )
}
