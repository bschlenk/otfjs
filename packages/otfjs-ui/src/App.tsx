import { useState } from 'react'
import { FontView } from './components/font-view/font-view'
import styles from './app.module.css'
import { srOnly } from './styles/utils.module.css'

function preventDefault(e: React.SyntheticEvent) {
  e.preventDefault()
}

export function App() {
  const [font, setFont] = useState<ArrayBuffer | null>(null)

  return (
    <div
      className={styles.app}
      onDragOver={preventDefault}
      onDrop={preventDefault}
    >
      {!font ? (
        <DropZone onLoad={setFont}>
          <p>Drag font here to load it on the page.</p>
        </DropZone>
      ) : (
        <FontView font={font} />
      )}
    </div>
  )
}

function DropZone({
  children,
  onLoad,
}: {
  children: React.ReactNode
  onLoad: (file: ArrayBuffer) => void
}) {
  return (
    <div className={styles.fullCenter}>
      <label
        className={styles.dropZone}
        onDragOver={preventDefault}
        onDrop={(e) => {
          e.preventDefault()
          e.dataTransfer.files[0].arrayBuffer().then(onLoad)
        }}
      >
        <input
          type="file"
          accept=".otf,.ttf"
          className={srOnly}
          onChange={(e) => {
            e.target.files![0].arrayBuffer().then(onLoad)
          }}
        />
        {children}
      </label>
    </div>
  )
}
