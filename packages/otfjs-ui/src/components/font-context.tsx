import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { Font } from 'otfjs'

import { HasChildren } from '../types/has-children'
import { noop } from '../utils/noop'
import { fetchFont } from '../utils/fetch-font'

interface FontContextValue {
  font: Font | null
  setFont: (font: Font | null) => void
}

const FontContext = createContext<FontContextValue>({
  font: null,
  setFont: noop,
})

export function FontProvider({ children }: HasChildren) {
  const [font, setFont] = useState<Font | null>(null)
  const value = useMemo(() => ({ font, setFont }), [font])
  return <FontContext.Provider value={value}>{children}</FontContext.Provider>
}

export function useFont() {
  const { font } = useContext(FontContext)

  if (!font) {
    throw new Error(
      'No font set. Either call useFontOrNull instead or ensure this ' +
        'part of the subtree is only rendered when a font is set.',
    )
  }

  return font
}

export function useFontOrNull() {
  return useContext(FontContext).font
}

export function useSetFont() {
  return useContext(FontContext).setFont
}

export function useClearFont() {
  const setFont = useSetFont()
  return useCallback(() => setFont(null), [])
}

export function useFetchFont() {
  const setFont = useSetFont()

  return useCallback(async (url: string) => {
    try {
      const font = await fetchFont(url)
      setFont(font)
    } catch (e) {
      // TODO: some kind of toast on failure?
      console.error('Failed to load font', e)
    }
  }, [])
}
