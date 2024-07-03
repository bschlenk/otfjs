import { useState } from 'react'

import fontsList from '/fonts.json?url'

export type FontsList = typeof import('../../fonts.json')
export type Font = FontsList['items'][number]

export interface FontPickerProps {
  onChange: (font: Font) => void
}

export function FontPicker(props: FontPickerProps) {
  const [fonts, setFonts] = useState<FontsList | null>(null)

  if (!fonts) {
    return (
      <button
        onClick={() => {
          fetch(fontsList)
            .then((res) => res.json())
            .then(setFonts)
        }}
      >
        Load google fonts list
      </button>
    )
  }

  return (
    <label>
      Select a google font
      <select
        onChange={(e) => {
          const font = fonts.items[Number(e.target.value)]
          props.onChange(font)
        }}
      >
        <option key={'-'} value={'-'}>
          ---
        </option>
        {fonts.items.map((font, i) => (
          <option key={font.family} value={i}>
            {font.family}
          </option>
        ))}
      </select>
    </label>
  )
}
