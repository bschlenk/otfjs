import { createContext, useContext } from 'react'
import { Font } from 'otfjs'

export const FontContext = createContext<Font | null>(null)

export function useFont() {
  const font = useContext(FontContext)

  if (!font) {
    throw new Error(
      'No font set. Either call useFontOrNull instead or ensure this ' +
        'part of the subtree is only rendered when a font is set.',
    )
  }

  return font
}

export function useFontOrNull() {
  return useContext(FontContext)
}
