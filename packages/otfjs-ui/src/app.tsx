import { useFontOrNull } from './components/font-context'
import { FontView } from './components/font-view/font-view'
import { FullScreenDropZone } from './components/full-screen-drop-zone/full-screen-drop-zone'
import { NoFontView } from './components/no-font-view/no-font-view'

export function App() {
  const font = useFontOrNull()

  return (
    <FullScreenDropZone>
      {font ?
        <FontView font={font} />
      : <NoFontView />}
    </FullScreenDropZone>
  )
}
