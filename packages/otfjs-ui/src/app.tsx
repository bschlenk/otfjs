import { useState } from 'react'
import { type Font } from 'otfjs'

import { FontView } from './components/font-view/font-view'
import { NoFontView } from './components/no-font-view/no-font-view'
import { PREVENT_DRAG } from './utils/event'

export function App() {
  const [font, setFont] = useState<Font | null>(null)

  return (
    <div className="h-full" {...PREVENT_DRAG}>
      {!font ?
        <NoFontView onFont={setFont} />
      : <FontView font={font} onBack={() => setFont(null)} />}
    </div>
  )
}
