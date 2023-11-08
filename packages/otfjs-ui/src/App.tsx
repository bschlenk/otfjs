import { useState } from 'react'
import styles from './app.module.css'
import { FontView } from './components/font-view/font-view'

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
      <div
        className={styles.dropZone}
        onDragOver={preventDefault}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          const reader = new FileReader()
          reader.onload = (e) => {
            const buffer = e.target?.result
            onLoad(buffer as ArrayBuffer)
          }
          reader.readAsArrayBuffer(file)
        }}
      >
        {children}
      </div>
    </div>
  )
}
