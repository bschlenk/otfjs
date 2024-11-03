import { useCallback, useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { SearchBar } from './components/search-bar'
import { FontGrid } from './font-grid'

import styles from './no-font-view.module.css'

export interface NoFontViewProps {
  onLoad: (buff: ArrayBuffer) => void
}

export function NoFontView({ onLoad }: NoFontViewProps) {
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  const onChange = useCallback(
    (fontUrl: string) => {
      void fetch(fontUrl)
        .then((res) => res.arrayBuffer())
        .then(onLoad)
    },
    [onLoad],
  )

  return (
    <div className={styles.root}>
      <SearchBar onChange={setFilter} />
      <FontGrid fonts={fonts} filter={deferredSearch} onChange={onChange} />
    </div>
  )
}
