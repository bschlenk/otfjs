import { memo, useEffect, useMemo, useRef } from 'react'

import { handle } from '../../shortcuts/shortcuts'
import { addListener } from '../../utils/event'
import { entriesFilterMap } from '../../utils/object'
import { FontIcon } from '../font-icon/font-icon'

import styles from './font-grid.module.css'
import { Link, useRouter } from '@tanstack/react-router'
import { Fonts } from '../../types/fonts'
import { createElementWalkerFactory } from '../../utils/dom'
import { useTimeoutAfterSet } from '../../hooks/use-timeout-after-set'

type GridEl = HTMLDivElement
type CellEl = HTMLButtonElement

export interface FontGridProps {
  fonts: Fonts
  filter?: string
  onBeforeChange: (fontUrl: string) => void
}

export const FontGrid = memo(function FontGrid({
  fonts,
  filter,
}: FontGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const getColumns = useColumns(ref)
  const router = useRouter()

  const preloadLink = (el: HTMLAnchorElement) => {
    router.preloadRoute({
      to: '/fonts/$name',
      params: { name: el.getAttribute('data-name')! },
    })
  }

  const setFocusedAnchor = useTimeoutAfterSet(400, preloadLink)

  const createWalker = useMemo(
    () =>
      createElementWalkerFactory(
        ref,
        (node): node is HTMLAnchorElement => node.tagName === 'A',
      ),
    [],
  )

  return (
    <div
      ref={ref}
      role="grid"
      aria-label="Fonts"
      className={styles.root}
      onKeyDown={(e) => {
        const key = handle(e)
        const t = e.target as HTMLAnchorElement

        switch (key.value) {
          case 'H':
          case '⌃P':
          case 'ArrowLeft': {
            return key.accept(() => {
              const walker = createWalker(t)
              walker.previousNode()?.focus()
            })
          }

          case 'L':
          case '⌃N':
          case 'ArrowRight': {
            return key.accept(() => {
              const walker = createWalker(t)
              walker.nextNode()?.focus()
            })
          }

          case 'K':
          case '⌃U':
          case 'ArrowUp': {
            return key.accept(() => {
              const walker = createWalker(t)
              let el: HTMLAnchorElement | null = t
              for (let i = 0; i < getColumns(); ++i) {
                el = walker.previousNode()
              }
              el?.focus()
            })
          }

          case 'J':
          case '⌃D':
          case 'ArrowDown': {
            return key.accept(() => {
              const walker = createWalker(t)
              let el: HTMLAnchorElement | null = t
              for (let i = 0; i < getColumns(); ++i) {
                el = walker.nextNode()
              }
              el?.focus()
            })
          }

          case 'PageUp': {
            return key.accept(() => {
              let rowsToMove = 0
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const cols = getColumns()
              let i = c.findIndex((el) => el === cell)
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

              el.querySelector('a')!.focus()
            })
          }

          case 'PageDown': {
            return key.accept(() => {
              let rowsToMove = 0
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const cols = getColumns()
              let i = c.findIndex((el) => el === cell)
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

              el.querySelector('a')!.focus()
            })
          }

          case 'Home': {
            // Moves focus to the first cell in the row that contains focus.
            return key.accept(() => {
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const i = c.findIndex((el) => el === cell)
              const cols = getColumns()
              ;(c[i - (i % cols)] as CellEl).querySelector('a')!.focus()
            })
          }

          case 'End': {
            // Moves focus to the last cell in the row that contains focus.
            return key.accept(() => {
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const i = c.findIndex((el) => el === cell)
              const cols = getColumns()
              ;(c[i - (i % cols) + cols - 1] as CellEl)
                .querySelector('a')!
                .focus()
            })
          }

          case '⌃Home': {
            return key.accept(() => {
              ;(ref.current!.firstElementChild as CellEl)
                .querySelector('a')!
                .focus()
            })
          }

          case '⌃End': {
            return key.accept(() => {
              ;(ref.current!.lastElementChild as CellEl)
                .querySelector('a')!
                .focus()
            })
          }
        }
      }}
      onPointerDown={(e) => {
        if (e.target instanceof HTMLAnchorElement) {
          preloadLink(e.target)
        }
      }}
      onFocus={(e) => {
        if (e.target instanceof HTMLAnchorElement) {
          setFocusedAnchor(e.target)
        }
      }}
    >
      {entriesFilterMap(
        fonts,
        (family) => !filter || searchCompare(family, filter),
        (family, _) => (
          <FontTile key={family} name={family} />
        ),
      )}
    </div>
  )
})

interface FontTileProps {
  name: string
}

function FontTile({ name }: FontTileProps) {
  return (
    <div role="gridcell">
      <Link
        to="/fonts/$name"
        data-name={name}
        params={{ name }}
        className={styles.button}
      >
        <div className={styles.tile}>
          <FontIcon name={name} size={100} />
        </div>
        <span className="text-center text-(--color-text-secondary)">
          {name}
        </span>
      </Link>
    </div>
  )
}

function searchCompare(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

function useColumns(ref: React.RefObject<HTMLDivElement | null>) {
  const columns = useRef<number | null>(null)

  useEffect(
    () =>
      addListener(window, 'resize', () => {
        columns.current = null
      }),
    [],
  )

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
