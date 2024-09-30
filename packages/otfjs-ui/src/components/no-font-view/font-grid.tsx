import { memo } from 'react'

import { GOOGLE_FONT_DOMAIN } from '../../constants'
import { entriesFilterMap } from '../../utils/object'

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
      className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-10 p-7"
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
    <button
      className="flex flex-col items-center gap-3 rounded-2xl border-0 bg-transparent p-0 text-[#dfdfdf] [&_*]:pointer-events-none"
      data-url={url}
    >
      <div className="grid aspect-square w-full place-content-center rounded-2xl border border-solid border-[#3c3c3c] bg-[#2e2e2e] p-1">
        <svg width={100} height={100} fill="var(--color-text)">
          <use
            href={`preview.svg#${name.toLowerCase().replaceAll(' ', '-')}`}
          />
        </svg>
      </div>
      <span className="text-center text-[#ddd]">{name}</span>
    </button>
  )
}

function urlForFont(pathname: string) {
  return new URL(pathname, GOOGLE_FONT_DOMAIN).toString()
}

function searchCompare(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}
