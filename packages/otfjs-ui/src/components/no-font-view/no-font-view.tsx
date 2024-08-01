import { Font } from 'otfjs'

import fonts from '../../fonts.json'
import { DropZone } from '../drop-zone/drop-zone'
import { FontGrid } from '../font-grid'

export interface NoFontViewProps {
  onFont(font: Font): void
}

export function NoFontView({ onFont }: NoFontViewProps) {
  function onLoad(buff: ArrayBuffer) {
    onFont(new Font(buff))
  }

  return (
    <div>
      <DropZone onLoad={onLoad}>
        <p>Drag font here to load it on the page.</p>
      </DropZone>
      <FontGrid
        fonts={fonts.items}
        onChange={(fontUrl) => {
          fetch(fontUrl)
            .then((res) => res.arrayBuffer())
            .then(onLoad)
        }}
      />
    </div>
  )
}
