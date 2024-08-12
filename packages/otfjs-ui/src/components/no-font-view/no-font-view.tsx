import { useCallback, useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { FontGrid } from './font-grid'

export interface NoFontViewProps {
  onLoad(buff: ArrayBuffer): void
}

export function NoFontView({ onLoad }: NoFontViewProps) {
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  const onChange = useCallback(
    (fontUrl: string) => {
      fetch(fontUrl)
        .then((res) => res.arrayBuffer())
        .then(onLoad)
    },
    [onLoad],
  )

  return (
    <div className="relative">
      <SearchBar onChange={setFilter} />
      <FontGrid fonts={fonts} filter={deferredSearch} onChange={onChange} />
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
