import { Font } from 'otfjs'

import fonts from '../../fonts.json'
import { FontGrid } from '../font-grid'

export interface NoFontViewProps {
  onFont(font: Font): void
}

export function NoFontView({ onFont }: NoFontViewProps) {
  function onLoad(buff: ArrayBuffer) {
    onFont(new Font(buff))
  }

  return (
    <FontGrid
      fonts={fonts.items}
      onChange={(fontUrl) => {
        fetch(fontUrl)
          .then((res) => res.arrayBuffer())
          .then(onLoad)
      }}
    />
  )
}
