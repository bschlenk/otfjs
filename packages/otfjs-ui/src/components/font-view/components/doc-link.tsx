import { IconLink } from '../../icons/icon-link'

export function DocLink({ tag }: { tag: string }) {
  const url = `https://learn.microsoft.com/en-us/typography/opentype/spec/${tag}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-md inline-block px-2 py-4 text-[var(--color-text)]"
    >
      {tag} <IconLink className="inline" />
    </a>
  )
}
