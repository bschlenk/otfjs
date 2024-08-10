import { useCallback, useState } from 'react'
import { Font, isWoff2 } from 'otfjs'

import { FontView } from './components/font-view/font-view'
import { FullScreenDropZone } from './components/full-screen-drop-zone/full-screen-drop-zone'
import { NoFontView } from './components/no-font-view/no-font-view'

export function App() {
  const [font, setFont] = useState<Font | null>(null)

  const onLoad = useCallback((buff: ArrayBuffer) => {
    readFont(buff).then(setFont)
  }, [])

  return (
    <FullScreenDropZone onLoad={onLoad}>
      {!font ?
        <NoFontView onLoad={onLoad} />
      : <FontView font={font} onBack={() => setFont(null)} />}
    </FullScreenDropZone>
  )
}

async function readFont(buff: ArrayBuffer) {
  if (isWoff2(buff)) {
    const woff2 = await import('otfjs/woff2')
    buff = woff2.decodeWoff2(buff)
  }

  return new Font(buff)
}
