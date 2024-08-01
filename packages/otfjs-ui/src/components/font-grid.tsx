import { getItemOrFirst } from '../utils/object'

export interface FontGridProps {
  fonts: (typeof import('../fonts.json'))['items']
  onChange: (fontUrl: string) => void
}

export function FontGrid({ fonts, onChange }: FontGridProps) {
  return (
    <div
      className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-10 p-7"
      onClick={(e) => {
        const url = (e.target as HTMLElement).getAttribute('data-url')
        if (!url) return

        onChange(url)
      }}
    >
      {fonts.map((font) => (
        <FontTile key={font.family} name={font.family} url={urlForFont(font)} />
      ))}
    </div>
  )
}

interface FontTileProps {
  name: string
  url: string
}

function FontTile({ name, url }: FontTileProps) {
  return (
    <div
      className="flex flex-col items-center gap-3 text-[#dfdfdf] [&_*]:pointer-events-none"
      tabIndex={0}
      data-url={url}
    >
      <div className="grid aspect-square w-full place-content-center rounded-2xl border border-solid border-[#3c3c3c] bg-[#2e2e2e] p-1">
        <svg width={100} height={100}>
          <use
            href={`/preview.svg#${name.toLowerCase().replaceAll(' ', '-')}`}
          />
        </svg>
      </div>
      <span className="text-center text-[#ddd]">{name}</span>
    </div>
  )
}

function urlForFont(font: FontGridProps['fonts'][number]) {
  const url = new URL(
    getItemOrFirst(font.files as Record<string, string>, 'regular')!,
  )
  url.protocol = 'https:'
  return url.toString()
}
