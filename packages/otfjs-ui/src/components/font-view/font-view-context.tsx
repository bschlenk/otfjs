import { createContext, useContext, useMemo, useState } from 'react'

export const enum FontViewMode {
  Inspect,
  Type,
}

interface FontViewContextValue {
  mode: FontViewMode
  setMode: React.Dispatch<React.SetStateAction<FontViewMode>>
}

const FontViewContext = createContext<FontViewContextValue>({
  mode: FontViewMode.Inspect,
  setMode: () => {},
})

export function FontViewProvider({
  value,
  children,
}: {
  value: FontViewContextValue
  children: React.ReactNode
}) {
  return (
    <FontViewContext.Provider value={value}>
      {children}
    </FontViewContext.Provider>
  )
}

export function useFontViewState() {
  const [mode, setMode] = useState(FontViewMode.Inspect)
  return useMemo(() => ({ mode, setMode }), [mode])
}

export function useFontView() {
  return useContext(FontViewContext)
}
