import * as vec from '@bschlenk/vec'
import type React from 'react'

export const PREVENT_DRAG = {
  onDragOver: preventDefault,
  onDrop: preventDefault,
}

export function preventDefault(e: Event | React.SyntheticEvent) {
  return e.preventDefault()
}

export function relativeMouse(
  e: { clientX: number; clientY: number },
  target: HTMLElement,
): vec.Vector {
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  return vec.vec(x, y)
}
