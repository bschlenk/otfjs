import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import type { LocalFontData } from '../../hooks/use-local-font-access'
import { useTimeoutAfterSet } from '../../hooks/use-timeout-after-set'
import { handle } from '../../shortcuts/shortcuts'
import { createElementWalkerFactory } from '../../utils/dom'
import { addListener } from '../../utils/event'
import { readAndCacheFont } from '../../utils/fetch-font'

import styles from '../no-font-view/font-grid.module.css'

type CellEl = HTMLButtonElement

export interface LocalFontGridProps {
  fonts: LocalFontData[]
  filter?: string
}

export const LocalFontGrid = memo(function LocalFontGrid({
  fonts,
  filter,
}: LocalFontGridProps) {
  const ref = useRef<HTMLDivElement>(null)
  const getColumns = useColumns(ref)
  const navigate = useNavigate()

  const filteredFonts = useMemo(() => {
    if (!filter) return fonts
    return fonts.filter((font) =>
      font.family.toLowerCase().includes(filter.toLowerCase()),
    )
  }, [fonts, filter])

  const preloadFont = async (fontData: LocalFontData) => {
    try {
      const blob = await fontData.blob()
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)
      const fontId = await readAndCacheFont(uint8Array)
      return fontId
    } catch (err) {
      console.error('Failed to load font:', err)
      return null
    }
  }

  const setFocusedButton = useTimeoutAfterSet(400, (el: HTMLButtonElement) => {
    const fontFamily = el.getAttribute('data-name')
    const fontData = filteredFonts.find((f) => f.family === fontFamily)
    if (fontData) {
      void preloadFont(fontData)
    }
  })

  const createWalker = useMemo(
    () =>
      createElementWalkerFactory(
        ref,
        (node): node is HTMLButtonElement => node.tagName === 'BUTTON',
      ),
    [],
  )

  return (
    <div
      ref={ref}
      role="grid"
      aria-label="Local Fonts"
      className={styles.root}
      onKeyDown={(e) => {
        const key = handle(e)
        const t = e.target as HTMLButtonElement

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
              let el: HTMLButtonElement | null = t
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
              let el: HTMLButtonElement | null = t
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
                if (box.top < 0) break
              }

              el.querySelector('button')!.focus()
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
                if (box.bottom > window.innerHeight) break
              }

              el.querySelector('button')!.focus()
            })
          }

          case 'Home': {
            return key.accept(() => {
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const i = c.findIndex((el) => el === cell)
              const cols = getColumns()
              ;(c[i - (i % cols)] as CellEl).querySelector('button')!.focus()
            })
          }

          case 'End': {
            return key.accept(() => {
              const c = Array.from(ref.current!.children)
              const cell = t.parentElement!
              const i = c.findIndex((el) => el === cell)
              const cols = getColumns()
              ;(c[i - (i % cols) + cols - 1] as CellEl)
                .querySelector('button')!
                .focus()
            })
          }

          case '⌃Home': {
            return key.accept(() => {
              ;(ref.current!.firstElementChild as CellEl)
                .querySelector('button')!
                .focus()
            })
          }

          case '⌃End': {
            return key.accept(() => {
              ;(ref.current!.lastElementChild as CellEl)
                .querySelector('button')!
                .focus()
            })
          }
        }
      }}
      onPointerDown={(e) => {
        if (e.target instanceof HTMLButtonElement) {
          const fontFamily = e.target.getAttribute('data-name')
          const fontData = filteredFonts.find((f) => f.family === fontFamily)
          if (fontData) {
            void preloadFont(fontData)
          }
        }
      }}
      onFocus={(e) => {
        if (e.target instanceof HTMLButtonElement) {
          setFocusedButton(e.target)
        }
      }}
    >
      {filteredFonts.map((font) => (
        <LocalFontTile
          key={font.family}
          fontData={font}
          onClick={() => {
            void (async () => {
              const fontId = await preloadFont(font)
              if (fontId !== null) {
                void navigate({ to: '/', state: { fontId } })
              }
            })()
          }}
        />
      ))}
    </div>
  )
})

interface LocalFontTileProps {
  fontData: LocalFontData
  onClick: () => void
}

function LocalFontTile({ fontData, onClick }: LocalFontTileProps) {
  const [previewSvg, setPreviewSvg] = useState<string>('')

  useEffect(() => {
    // Generate preview SVG for the local font
    const generatePreview = async () => {
      try {
        const blob = await fontData.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        
        // For now, we'll use a simple text-based preview
        // In a real implementation, you'd parse the font and render glyphs
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
            <style>
              @font-face {
                font-family: 'PreviewFont';
                src: url(data:font/ttf;base64,${btoa(String.fromCharCode(...uint8Array))});
              }
            </style>
            <text x="50" y="70" font-family="PreviewFont" font-size="60" text-anchor="middle" fill="currentColor">Aa</text>
          </svg>
        `
        setPreviewSvg(svg)
      } catch (err) {
        console.error('Failed to generate preview:', err)
      }
    }

    void generatePreview()
  }, [fontData])

  return (
    <div role="gridcell">
      <button
        type="button"
        data-name={fontData.family}
        onClick={onClick}
        className={styles.button}
      >
        <div className={styles.tile}>
          {previewSvg ? (
            <div
              dangerouslySetInnerHTML={{ __html: previewSvg }}
              style={{ width: 100, height: 100 }}
            />
          ) : (
            <div style={{ width: 100, height: 100 }} />
          )}
        </div>
        <span className="text-center text-(--color-text-secondary)">
          {fontData.family}
        </span>
      </button>
    </div>
  )
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
