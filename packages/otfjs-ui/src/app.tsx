import { useState } from 'react'

import { DropZone } from './components/drop-zone/drop-zone'
import { FontGrid } from './components/font-grid'
import { FontView } from './components/font-view/font-view'
import fonts from './fonts.json'
import { preventDefault } from './utils/event'

export function App() {
  const [font, setFont] = useState<ArrayBuffer | null>(null)

  return (
    <div className="h-full" onDragOver={preventDefault} onDrop={preventDefault}>
      {!font ?
        <div>
          <DropZone onLoad={setFont}>
            <p>Drag font here to load it on the page.</p>
          </DropZone>
          <FontGrid
            fonts={fonts.items}
            onChange={(fontUrl) => {
              fetch(fontUrl)
                .then((res) => res.arrayBuffer())
                .then(setFont)
            }}
          />
        </div>
      : <FontView font={font} onBack={() => setFont(null)} />}
    </div>
  )
}
