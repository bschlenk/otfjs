import { useDeferredValue, useEffect, useState } from 'react'

import fonts from '../../fonts.json'
import {
  useLocalFontAccessSupport,
  useLocalFonts,
} from '../../hooks/use-local-font-access'
import {
  FontSource,
  FontSourceSelector,
} from '../font-source-selector/font-source-selector'
import { SearchBar } from './components/search-bar'
import { FontGrid } from './font-grid'
import { LocalFontGrid } from './local-font-grid'

import styles from './no-font-view.module.css'

export function NoFontView() {
  const [filter, setFilter] = useState('')
  const deferredSearch = useDeferredValue(filter)
  const [fontSource, setFontSource] = useState<FontSource>('google')
  const isLocalFontSupported = useLocalFontAccessSupport()
  const { fonts: localFonts, fetchLocalFonts } = useLocalFonts()

  useEffect(() => {
    if (fontSource === 'local' && localFonts.length === 0) {
      void fetchLocalFonts()
    }
  }, [fontSource, localFonts.length, fetchLocalFonts])

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <SearchBar onChange={setFilter} />
        {isLocalFontSupported && (
          <FontSourceSelector value={fontSource} onChange={setFontSource} />
        )}
      </div>
      {fontSource === 'google' ?
        <FontGrid fonts={fonts} filter={deferredSearch} />
      : <LocalFontGrid fonts={localFonts} filter={deferredSearch} />}
    </div>
  )
}
