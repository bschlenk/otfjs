import { useState } from 'react'
import { FontView } from './components/font-view/font-view'
import styles from './app.module.css'
import { DropZone } from './components/drop-zone/drop-zone'
import { preventDefault } from './utils/event'
import { FontPicker } from './components/font-picker/font-picker'

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
