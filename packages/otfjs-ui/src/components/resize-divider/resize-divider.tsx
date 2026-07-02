import { useCallback, useRef } from 'react'

import styles from './resize-divider.module.css'

interface ResizeDividerProps {
  direction: 'col' | 'row'
  onDrag: (delta: number) => void
}

export function ResizeDivider({ direction, onDrag }: ResizeDividerProps) {
  const onDragRef = useRef(onDrag)
  onDragRef.current = onDrag

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      document.body.style.userSelect = 'none'
      let last = direction === 'col' ? e.clientX : e.clientY

      const onMove = (ev: PointerEvent) => {
        const current = direction === 'col' ? ev.clientX : ev.clientY
        const delta = current - last
        last = current
        onDragRef.current(delta)
      }
      const onUp = (ev: PointerEvent) => {
        ;(ev.target as HTMLElement).releasePointerCapture(ev.pointerId)
        document.body.style.userSelect = ''
        document.removeEventListener('pointermove', onMove)
        document.removeEventListener('pointerup', onUp)
      }
      document.addEventListener('pointermove', onMove)
      document.addEventListener('pointerup', onUp)
    },
    [direction],
  )

  return (
    <div
      className={`${styles.resizeDivider} ${styles[direction]}`}
      onPointerDown={handlePointerDown}
    />
  )
}
