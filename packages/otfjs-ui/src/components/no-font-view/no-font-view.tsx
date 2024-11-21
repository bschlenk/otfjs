import { useCallback, useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { useLoadFont } from '../font-context'
import { SearchBar } from './components/search-bar'
import { FontGrid } from './font-grid'

import styles from './no-font-view.module.css'

export function NoFontView() {
  const loadFont = useLoadFont()
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  const onChange = useCallback(
    (fontUrl: string) => {
      void fetch(fontUrl)
        .then((res) => res.arrayBuffer())
        .then(loadFont)
    },
    [loadFont],
  )

  return (
    <div className={styles.root}>
      <SearchBar onChange={setFilter} />
      <FontGrid fonts={fonts} filter={deferredSearch} onChange={onChange} />
    </div>
  )
}
