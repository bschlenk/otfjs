import fonts from '../../fonts.json'
import { FontGrid } from '../font-grid'

export interface NoFontViewProps {
  onLoad(buff: ArrayBuffer): void
}

export function NoFontView({ onLoad }: NoFontViewProps) {
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
