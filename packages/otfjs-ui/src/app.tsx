import { useState } from 'react'

import { DropZone } from './components/drop-zone/drop-zone'
import { FontPicker } from './components/font-picker/font-picker'
import { FontView } from './components/font-view/font-view'
import { preventDefault } from './utils/event'

import styles from './app.module.css'

export function App() {
  const [font, setFont] = useState<ArrayBuffer | null>(null)

  return (
    <div
      className={styles.app}
      onDragOver={preventDefault}
      onDrop={preventDefault}
    >
      {!font ? (
        <div className={styles.fullCenter}>
          <DropZone onLoad={setFont}>
            <p>Drag font here to load it on the page.</p>
          </DropZone>
          <FontPicker
            onChange={(font) => {
              fetch(font.files.regular!)
                .then((res) => res.arrayBuffer())
                .then(setFont)
            }}
          />
        </div>
      ) : (
        <FontView font={font} />
      )}
    </div>
  )
}
