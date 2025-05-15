import { useDeferredValue, useState } from 'react'

import fonts from '../../fonts.json'
import { useFetchFont } from '../font-context'
import { SearchBar } from './components/search-bar'
import { FontGrid } from './font-grid'

import styles from './no-font-view.module.css'
import { fetchFont } from '../../utils/fetch-font'

export function NoFontView() {
  const loadFont = useFetchFont()
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)

  return (
    <div className={styles.root}>
      <SearchBar onChange={setFilter} />
      <FontGrid
        fonts={fonts}
        filter={deferredSearch}
        onChange={loadFont}
        onBeforeChange={fetchFont}
      />
    </div>
  )
}
