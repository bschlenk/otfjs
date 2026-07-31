import { useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { FontGrid } from './font-list.components/font-grid'
import { SearchBar } from './font-list.components/search-bar'

import styles from './font-list.module.css'

export function FontList() {
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  return (
    <div className={styles.root}>
      <SearchBar onChange={setFilter} />
      <FontGrid fonts={fonts} filter={deferredSearch} />
    </div>
  )
}
