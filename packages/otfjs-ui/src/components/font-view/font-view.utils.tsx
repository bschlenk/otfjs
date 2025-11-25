import { Fragment, useState } from 'react'
import { disassemble, Font } from 'otfjs'

import { makeColor } from '../../utils/color'
import { JsonView } from './components/json-view'
import { GlyfView } from './glyf-view'

import styles from './font-view.module.css'

export const TABLE_MAP: Record<string, React.ComponentType<{ font: Font }>> = {
  'CFF ': jsonView('CFF '),
  cmap: CmapView,
  COLR: jsonView('COLR'),
  CPAL: CpalView,
  'cvt ': arrayView('cvt '),
  fpgm: instructionView('fpgm'),
  glyf: GlyfView,
  GPOS: jsonView('GPOS', { version: toHex }),
  head: jsonView('head'),
  hhea: jsonView('hhea'),
  hmtx: jsonView('hmtx'),
  MATH: jsonView('MATH'),
  maxp: jsonView('maxp', { version: toHex }),
  loca: jsonView('loca'),
  name: jsonView('name'),
  'OS/2': jsonView('OS/2'),
  post: jsonView('post', { version: toHex }),
  prep: instructionView('prep'),
}

function jsonView(
  tag: string,
  replacements?: Record<string, (value: any) => any>,
) {
  return ({ font }: { font: Font }) => {
    const table = font.getTable(tag)
    return <JsonView data={table as object} replacements={replacements} />
  }
}

function CmapView({ font }: { font: Font }) {
  const [chars, setChars] = useState('')

  const table = font.getTable('cmap')
  const glyphIndices: [string, number][] = []

  for (const char of chars) {
    const codePoint = char.codePointAt(0)!
    const glyphIndex = table.getGlyphIndex(codePoint)
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

function CpalView({ font }: { font: Font }) {
  const table = font.getTable('CPAL')

  return (
    <>
      <JsonView data={table} replacements={{ colorRecords: () => undefined }} />
      {Array.from(table.iterPalettes(), (palette, i) => (
        <div key={i} className="mt-2">
          <h2>Palette {i}</h2>
          <div className="flex flex-wrap gap-1">
            {palette.map((c, j) => (
              <div
                key={j}
                className="h-11 w-11 border-2 border-white"
                style={{ background: `rgb(${c.r} ${c.g} ${c.b} / ${c.a})` }}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  )
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
    const table = font.getTable(tag) as Iterable<number>
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
    const table = font.getTable(tag) as Uint8Array
    return <InstructionView data={table} />
  }
}

function toHex<T extends number>(n: T, pad = 8) {
  if (typeof n !== 'number') return n
  return `0x${n.toString(16).padStart(pad, '0')}`
}
