import type { RGBA } from './types.js'

export function rgbaToCss({ r, g, b, a }: RGBA, alpha = 1) {
  return `rgb(${r} ${g} ${b} / ${a * alpha})`
}
