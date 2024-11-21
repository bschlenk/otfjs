import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'
import { Font, isWoff2 } from 'otfjs'

import { HasChildren } from '../types/has-children'
import { noop } from '../utils/noop'

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
      'No font set. Either call useFontOrNull instead or ensure this part of the subtree is only rendered when a font is set.',
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

export function useLoadFont() {
  const setFont = useSetFont()

  return useCallback((buff: ArrayBuffer) => {
    // TODO: some kind of toast on failure?
    void readFont(new Uint8Array(buff)).then(setFont)
  }, [])
}

async function readFont(buff: Uint8Array) {
  if (isWoff2(buff)) {
    const woff2 = await import('otfjs/woff2')
    buff = woff2.decodeWoff2(buff)
  }

  return new Font(buff)
}
