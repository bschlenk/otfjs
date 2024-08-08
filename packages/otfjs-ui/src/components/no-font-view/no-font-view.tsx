import { useState } from 'react'

import fonts from '../../fonts.json'
import { FontGrid } from './font-grid'

export interface NoFontViewProps {
  onLoad(buff: ArrayBuffer): void
}

export function NoFontView({ onLoad }: NoFontViewProps) {
  const [search, setSearch] = useState('')

  return (
    <div className="relative">
      <SearchBar onChange={setSearch} />
      <FontGrid
        fonts={fonts.items}
        filter={search}
        onChange={(fontUrl) => {
          fetch(fontUrl)
            .then((res) => res.arrayBuffer())
            .then(onLoad)
        }}
      />
    </div>
  )
}

interface SearchBarProps {
  onChange(value: string): void
}

function SearchBar({ onChange }: SearchBarProps) {
  return (
    <div className="sticky top-0 flex justify-end">
      <input
        className="min-w-64 rounded-full border border-white px-3 py-1"
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </div>
  )
}
