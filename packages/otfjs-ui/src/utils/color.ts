import { RGBA } from 'otfjs'

export function makeColor(i: number) {
  return `hsl(${i * 20} 80% 80%)`
}

export function rgbaToCss({ r, g, b, a }: RGBA, alpha = 1) {
  return `rgb(${r} ${g} ${b} / ${a * alpha})`
}
