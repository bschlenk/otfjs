import { useState } from 'react'
import { Font } from 'otfjs'

import { FontView } from './components/font-view/font-view'
import { FullScreenDropZone } from './components/full-screen-drop-zone/full-screen-drop-zone'
import { NoFontView } from './components/no-font-view/no-font-view'

export function App() {
  const [font, setFont] = useState<Font | null>(null)

  const onLoad = (buff: ArrayBuffer) => setFont(new Font(buff))

  return (
    <FullScreenDropZone onLoad={onLoad}>
      {!font ?
        <NoFontView onLoad={onLoad} />
      : <FontView font={font} onBack={() => setFont(null)} />}
    </FullScreenDropZone>
  )
}
