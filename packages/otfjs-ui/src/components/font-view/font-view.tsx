import { Fragment, JSXElementConstructor, useMemo, useState } from 'react'
import clsx from 'clsx'
import { disassemble, Font, NameId } from 'otfjs'

import { makeColor } from '../../utils/color'
import { GlyfView } from './glyf-view'

import styles from './font-view.module.css'

const TABLE_MAP: Record<string, JSXElementConstructor<{ font: Font }>> = {
  cmap: CmapView,
  'cvt ': arrayView('cvt '),
  fpgm: instructionView('fpgm'),
  glyf: GlyfView,
  GPOS: jsonView('GPOS', { version: toHex }),
  head: jsonView('head'),
  hhea: jsonView('hhea'),
  hmtx: jsonView('hmtx'),
  maxp: jsonView('maxp', { version: toHex }),
  loca: jsonView('loca'),
  name: jsonView('name'),
  'OS/2': jsonView('OS/2'),
  post: jsonView('post', { version: toHex }),
  prep: instructionView('prep'),
}

interface FontViewProps {
  font: ArrayBuffer
  onBack: () => void
}

export function FontView(props: FontViewProps) {
  const font = useMemo(() => new Font(props.font), [props.font])
  const [tag, setTag] = useState('glyf')

  const TableComponent = TABLE_MAP[tag] ?? null

  return (
    <div className={styles.wrapper}>
      <div className={styles.tablesList}>
        <div className={styles.head}>
          <FontName font={font} />
          <button onClick={props.onBack}>⬅ Back</button>
        </div>
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

function FontName({ font }: { font: Font }) {
  const name = font.getName(NameId.FullFontName)
  return <h1 className={styles.fontName}>{name}</h1>
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

function ArrayView({
  data,
  bytesPerItem,
}: {
  data: Iterable<number>
  bytesPerItem?: number
}) {
  return (
    <ol>
      {Array.from(data).map((byte, i) => (
        <li key={i}>{bytesPerItem ? toHex(byte, bytesPerItem * 2) : byte}</li>
      ))}
    </ol>
  )
}

function arrayView(tag: string, bytesPerItem?: number) {
  return ({ font }: { font: Font }) => {
    const table = font.getTable(tag)
    return <ArrayView data={table} bytesPerItem={bytesPerItem} />
  }
}

function InstructionView({ data }: { data: Uint8Array }) {
  const instructions = disassemble(data)
  let max = instructions[instructions.length - 1].pc
  // for each 10 magnitude over 1000, increase padding by 10px
  let padMultiplier = 0
  while (max >= 1000) {
    max /= 10
    padMultiplier += 1
  }

  let nextColor = 0
  return (
    <ol style={{ margin: padMultiplier ? padMultiplier * 10 : undefined }}>
      {instructions.map((inst, i) => (
        <Fragment key={i}>
          <li
            value={inst.pc}
            style={{
              color:
                inst.name === 'FDEF' ? makeColor(nextColor)
                : inst.name === 'ENDF' ? makeColor(nextColor++)
                : undefined,
            }}
          >
            {inst.name}
          </li>
          {inst.args && (
            <ol>
              {inst.args.map((arg, j) => (
                <li key={j}>{arg}</li>
              ))}
            </ol>
          )}
        </Fragment>
      ))}
    </ol>
  )
}

function instructionView(tag: string) {
  return ({ font }: { font: Font }) => {
    const table = font.getTable(tag)
    return <InstructionView data={table} />
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

function toHex(n: any, pad = 8) {
  if (typeof n !== 'number') return n
  return `0x${n.toString(16).padStart(pad, '0')}`
}
