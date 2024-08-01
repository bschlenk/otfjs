import { useState } from 'react'
import { Font } from 'otfjs'

import { FontView } from './components/font-view/font-view'
import { FullScreenDropZone } from './components/full-screen-drop-zone/full-screen-drop-zone'
import { NoFontView } from './components/no-font-view/no-font-view'

export function App() {
  const [font, setFont] = useState<Font | null>(null)

  return (
    <FullScreenDropZone onLoad={(buffer) => setFont(new Font(buffer))}>
      {!font ?
        <NoFontView onFont={setFont} />
      : <FontView font={font} onBack={() => setFont(null)} />}
    </FullScreenDropZone>
  )
}
