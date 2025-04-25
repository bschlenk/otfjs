import { memo, useEffect, useRef } from 'react'

import { GOOGLE_FONT_DOMAIN } from '../../constants'
import { handle } from '../../shortcuts/shortcuts'
import { addListener } from '../../utils/event'
import { entriesFilterMap } from '../../utils/object'
import { FontIcon } from '../font-icon/font-icon'

import styles from './font-grid.module.css'

type GridEl = HTMLDivElement
type CellEl = HTMLButtonElement

export interface FontGridProps {
  fonts: typeof import('../../fonts.json')
  filter?: string
  onChange: (fontUrl: string) => void
}

export const FontGrid = memo(function FontGrid({
  fonts,
  filter,
  onChange,
}: FontGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const getColumns = useColumns(ref)

  useEffect(() => {
    // set the first element to have tabIndex = 0
    const el = ref.current!
    if (el.firstElementChild) {
      ;(el.firstElementChild as CellEl).tabIndex = 0
    }
  })

  return (
    <div
      ref={ref}
      role="grid"
      aria-label="Fonts"
      className={styles.root}
      onClick={(e) => {
        const url = (e.target as CellEl).getAttribute('data-url')
        if (!url) return
        onChange(url)
      }}
      onKeyDown={(e) => {
        const key = handle(e)

        const focus = (el: CellEl | null) => {
          if (!el) return
          el.tabIndex = 0
          el.focus()
        }

        const t = e.target as CellEl
        const ct = e.currentTarget as GridEl

        switch (key.value) {
          case 'H':
          case '⌃P':
          case 'ArrowLeft': {
            key.accept(() => {
              const el = t.previousElementSibling as CellEl | null
              focus(el)
            })
            break
          }

          case 'L':
          case '⌃N':
          case 'ArrowRight': {
            key.accept(() => {
              const el = t.nextElementSibling! as CellEl | null
              focus(el)
            })
            break
          }

          case 'K':
          case '⌃U':
          case 'ArrowUp': {
            key.accept(() => {
              let el: CellEl | null = t
              for (let i = 0; el && i < getColumns(); ++i) {
                el = el.previousElementSibling! as CellEl | null
              }
              focus(el)
            })
            break
          }

          case 'J':
          case '⌃D':
          case 'ArrowDown': {
            key.accept(() => {
              let el: CellEl | null = t
              for (let i = 0; el && i < getColumns(); ++i) {
                el = el.nextElementSibling! as CellEl | null
              }
              focus(el)
            })
            break
          }

          case 'PageUp': {
            key.accept(() => {
              let rowsToMove = 0
              const c = Array.from(ct.children)
              const cols = getColumns()
              let i = c.findIndex((el) => el === t)
              i = i - (i % cols)
              let el = c[i] as CellEl
              while (0 <= i - cols * (rowsToMove + 1)) {
                ++rowsToMove
                el = c[i - cols * rowsToMove] as CellEl
                const box = el.getBoundingClientRect()
                // TODO: can't use 0 here for real, need to
                // get the top of the container
                if (box.top < 0) break
              }

              focus(el)
            })
            break
          }

          case 'PageDown': {
            key.accept(() => {
              let rowsToMove = 0
              const c = Array.from(ct.children)
              const cols = getColumns()
              let i = c.findIndex((el) => el === t)
              i = i - (i % cols)
              let el = c[i] as CellEl
              while (c.length > i + cols * (rowsToMove + 1)) {
                ++rowsToMove
                el = c[i + cols * rowsToMove] as CellEl
                const box = el.getBoundingClientRect()
                // TODO: can't use innerHeight here for real, need to
                // get the bottom of the container
                if (box.bottom > window.innerHeight) break
              }

              focus(el)
            })
            break
          }

          case 'Home': {
            // Moves focus to the first cell in the row that contains focus.
            key.accept(() => {
              const c = Array.from(ct.children)
              const i = c.findIndex((el) => el === t)
              const cols = getColumns()
              focus(c[i - (i % cols)] as CellEl)
            })
            break
          }

          case 'End': {
            // Moves focus to the last cell in the row that contains focus.
            key.accept(() => {
              const c = Array.from(ct.children)
              const i = c.findIndex((el) => el === t)
              const cols = getColumns()
              focus(c[i - (i % cols) + cols - 1] as CellEl)
            })
            break
          }

          case '⌃Home': {
            key.accept(() => {
              focus(ct.firstElementChild as CellEl)
            })
            break
          }

          case '⌃End': {
            key.accept(() => {
              focus(ct.lastElementChild as CellEl)
            })
            break
          }
        }
      }}
      onFocus={(e) => {
        if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) {
          ;(e.relatedTarget as HTMLElement).tabIndex = -1
        }
      }}
    >
      {entriesFilterMap(
        fonts,
        (family) => !filter || searchCompare(family, filter),
        (family, pathname) => (
          <FontTile key={family} name={family} url={urlForFont(pathname)} />
        ),
      )}
    </div>
  )
})

interface FontTileProps {
  name: string
  url: string
}

function FontTile({ name, url }: FontTileProps) {
  return (
    <button
      role="gridcell"
      tabIndex={-1}
      className={styles.button}
      data-url={url}
    >
      <div className={styles.tile}>
        <FontIcon name={name} size={100} />
      </div>
      <span className="text-center text-[var(--color-text-secondary)]">
        {name}
      </span>
    </button>
  )
}

function urlForFont(pathname: string) {
  return new URL(pathname, GOOGLE_FONT_DOMAIN).toString()
}

function searchCompare(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function useColumns(ref: React.RefObject<HTMLDivElement | null>) {
  const columns = useRef<number | null>(null)

  useEffect(() => {
    return addListener(window, 'resize', () => {
      columns.current = null
    })
  }, [])

  return () => {
    if (columns.current !== null) return columns.current

    let lastLeft = 0
    let count = 0

    for (const child of ref.current!.children) {
      const box = child.getBoundingClientRect()
      if (box.left < lastLeft) {
        columns.current = count
        break
      }

      lastLeft = box.left
      ++count
    }

    return count
  }
}
