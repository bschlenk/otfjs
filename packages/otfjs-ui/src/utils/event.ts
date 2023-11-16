import type React from 'react'

export function preventDefault(e: Event | React.SyntheticEvent) {
  return e.preventDefault()
}
