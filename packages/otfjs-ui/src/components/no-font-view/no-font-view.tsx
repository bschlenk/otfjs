import { useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { SearchBar } from './components/search-bar'
import { FontGrid } from './font-grid'

import styles from './no-font-view.module.css'

export function NoFontView() {
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  return (
    <div className={styles.root}>
      <SearchBar onChange={setFilter} />
      <FontGrid fonts={fonts} filter={deferredSearch} />
    </div>
  )
}
