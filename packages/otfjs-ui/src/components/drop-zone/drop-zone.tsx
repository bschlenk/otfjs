import { preventDefault } from '../../utils/event'

import utilStyles from '../../styles/utils.module.css'
import styles from './drop-zone.module.css'

export function DropZone({
  children,
  onLoad,
}: {
  children: React.ReactNode
  onLoad: (file: ArrayBuffer) => void
}) {
  return (
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
        className={utilStyles.srOnly}
        onChange={(e) => {
          e.target.files![0].arrayBuffer().then(onLoad)
        }}
      />
      {children}
    </label>
  )
}
