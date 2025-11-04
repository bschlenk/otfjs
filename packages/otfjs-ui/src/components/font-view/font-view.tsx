import { useState } from 'react'
import clsx from 'clsx'
import { Font, NameId } from 'otfjs'

import { HasFont } from '../../types/has-font'
import { sizeToSTring } from '../../utils/bytes'
import { FontContext, useFont } from '../font-context'
import { FontIcon } from '../font-icon/font-icon'
import { IconBack } from '../icons/icon-back'
import { IconLink } from '../icons/icon-link'
import { Text } from '../text'
import { TABLE_MAP } from './font-view.utils'

import styles from './font-view.module.css'
import { Link } from '@tanstack/react-router'

interface FontViewProps {
  font: Font
}

export function FontView({ font }: FontViewProps) {
  const [tag, setTag] = useState(() =>
    font.hasTable('glyf') ? 'glyf'
    : font.hasTable('head') ? 'head'
    : font.tables[0],
  )

  return (
    <FontContext value={font}>
      <div className={styles.root}>
        <Head tag={tag} />
        <Sidebar tag={tag} setTag={setTag} />
        <TableView tag={tag} />
      </div>
    </FontContext>
  )
}

function Head({ tag }: { tag: string }) {
  const font = useFont()
  const name = font.getName(NameId.FontFamilyName)!

  return (
    <div className={styles.head}>
      <div className="flex items-center">
        <Link to="/">
          <IconBack />
        </Link>
        <FontIcon name={name} size={64} />
      </div>
      <div className="flex flex-col justify-center">
        <FontName font={font} />
        <div className="flex space-x-2">
          <FileSize font={font} />
          <GlyphCount font={font} />
        </div>
      </div>
      <div className="ml-auto">
        <DocLink tag={tag}>
          {tag} <IconLink className="inline" />
        </DocLink>
      </div>
    </div>
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

function FontName({ font }: HasFont) {
  const name = font.getName(NameId.FontFamilyName)
  return <h1 className="text-lg">{name}</h1>
}

function GlyphCount({ font }: HasFont) {
  return <Text.Tertiary>{font.numGlyphs} Glyphs</Text.Tertiary>
}

function FileSize({ font }: HasFont) {
  return (
    <Text.Tertiary title={`${font.size} Bytes`}>
      {sizeToSTring(font.size)}
    </Text.Tertiary>
  )
}

function DocLink({
  tag,
  children,
}: {
  tag: string
  children: React.ReactNode
}) {
  const url = `https://learn.microsoft.com/en-us/typography/opentype/spec/${tag}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-md inline-block px-2 py-4 text-[var(--color-text)]"
    >
      {children}
    </a>
  )
}
