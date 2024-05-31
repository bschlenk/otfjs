import { Vector } from 'otfjs/util'
import type React from 'react'

export function preventDefault(e: Event | React.SyntheticEvent) {
  return e.preventDefault()
}

export function relativeMouse(
  e: { clientX: number; clientY: number },
  target: HTMLElement,
): Vector {
  const rect = target.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  return { x, y }
}
