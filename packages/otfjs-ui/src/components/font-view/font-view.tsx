import { useRef, useState } from 'react'
import clsx from 'clsx'
import { Font, NameId } from 'otfjs'

import { FontContext, useFont } from '../font-context'
import { Head } from './components/head'
import { TableViewContext } from './font-view.hooks'
import { TABLE_MAP } from './font-view.utils'

import styles from './font-view.module.css'

interface FontViewProps {
  font: Font
}

export function FontView({ font }: FontViewProps) {
  const [tab, setTab] = useState('overview')

  return (
    <FontContext value={font}>
      <div className={styles.root}>
        <Sidebar tab={tab} setTab={setTab} />
        <View tab={tab} />
      </div>
    </FontContext>
  )
}

function Sidebar({
  tab,
  setTab,
}: {
  tab: string
  setTab: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <div className={styles.sidebar}>
      <Head className="mb-2" />
      <Tabs tab={tab} setTab={setTab} />
    </div>
  )
}

function Tabs({ tab, setTab }: { tab: string; setTab: (tab: string) => void }) {
  const font = useFont()

  return (
    <div className={styles.tabs}>
      <ul>
        <li>
          <button
            className={clsx({ [styles.active]: tab === 'overview' })}
            onClick={() => setTab('overview')}
          >
            Overview
          </button>
        </li>
        {font.tables.map((table) => (
          <li key={table}>
            <button
              className={clsx({ [styles.active]: tab === table })}
              onClick={() => setTab(table)}
            >
              {TABLE_MAP[table] ? table : '🚧 ' + table}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function View({ tab }: { tab: string }) {
  return tab === 'overview' ? <Overview /> : <TableView tag={tab} />
}

function Overview() {
  const font = useFont()
  const fontFamily = font.getName(NameId.FontFamilyName)

  return (
    <div className={styles.tableView}>
      <textarea
        autoFocus
        defaultValue={fontFamily!}
        style={{ fontFamily: `"${fontFamily}"` }}
        className="block h-full w-full resize-none bg-[var(--color-bg)] p-2 text-2xl"
      />
    </div>
  )
}

function TableView({ tag }: { tag: string }) {
  const font = useFont()
  const TableComponent = TABLE_MAP[tag]
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div ref={ref} className={styles.tableView}>
      <TableViewContext value={ref}>
        {TableComponent && <TableComponent font={font} />}
      </TableViewContext>
    </div>
  )
}
