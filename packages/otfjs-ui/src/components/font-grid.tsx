import { getItemOrFirst } from '../utils/object'

export interface FontGridProps {
  fonts: (typeof import('../fonts.json'))['items']
  onChange: (fontUrl: string) => void
}

export function FontGrid({ fonts, onChange }: FontGridProps) {
  return (
    <div
      className="grid grid-cols-5 gap-10"
      onClick={(e) => {
        const url = (e.target as HTMLElement).getAttribute('data-url')
        if (!url) return

        onChange(url)
      }}
    >
      {fonts.map((font) => {
        const url = new URL(
          getItemOrFirst(font.files as Record<string, string>, 'regular')!,
        )
        url.protocol = 'https:'

        const svg = `/previews/${font.family}.svg`
        return (
          <FontTile
            key={font.family}
            name={font.family}
            url={url.toString()}
            svg={svg}
          />
        )
      })}
    </div>
  )
}

interface FontTileProps {
  name: string
  url: string
  svg: string
}

function FontTile({ name, url, svg }: FontTileProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 text-[#dfdfdf] [&_*]:pointer-events-none"
      tabIndex={0}
      data-url={url}
    >
      <div className="grid aspect-square w-full place-content-center rounded-2xl border border-solid border-[#3c3c3c] bg-[#2e2e2e] p-1">
        <img className="h-full w-full object-contain" src={svg} alt="" />
      </div>
      <span className="text-center text-[#ddd]">{name}</span>
    </div>
  )
}
