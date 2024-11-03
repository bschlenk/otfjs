import { memo } from 'react'

import { GOOGLE_FONT_DOMAIN } from '../../constants'
import { entriesFilterMap } from '../../utils/object'

import styles from './font-grid.module.css'

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
  return (
    <div
      className={styles.root}
      onClick={(e) => {
        const url = (e.target as HTMLElement).getAttribute('data-url')
        if (!url) return

        onChange(url)
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
    <button className={styles.button} data-url={url}>
      <div className={styles.tile}>
        <svg width={100} height={100} fill="var(--color-text)">
          <use
            href={`preview.svg#${name.toLowerCase().replaceAll(' ', '-')}`}
          />
        </svg>
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
