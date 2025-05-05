import { NameId } from 'otfjs'
import clsx from 'clsx'

import { useClearFont, useFont } from '../../font-context'
import { FontViewMode, useFontView } from '../font-view-context'

import styles from '../font-view.module.css'
import { IconButton } from '../../icon-button/icon-button'
import { Text } from '../../text'
import { IconBack } from '../../icons/icon-back'
import { FontIcon } from '../../font-icon/font-icon'
import { HasFont } from '../../../types/has-font'
import { IconLink } from '../../icons/icon-link'
import { sizeToSTring as sizeToString } from '../../../utils/bytes'

export function Head({ tag }: { tag: string }) {
  const font = useFont()
  const clearFont = useClearFont()
  const name = font.getName(NameId.FontFamilyName)!
  const { setMode } = useFontView()

  return (
    <div className={styles.head}>
      <div className={styles.headSection}>
        <div className="flex items-center">
          <IconButton onClick={clearFont}>
            <IconBack />
          </IconButton>
          <FontIcon name={name} size={64} />
        </div>
        <div className="flex flex-col justify-center">
          <FontName font={font} />
          <div className="flex space-x-2">
            <FileSize font={font} />
            <GlyphCount font={font} />
          </div>
        </div>
      </div>
      <div className={clsx(styles.headSection, 'justify-center')}>
        <button onClick={() => setMode(FontViewMode.Inspect)}>Inspect</button>
        <button onClick={() => setMode(FontViewMode.Type)}>Type</button>
      </div>
      <div className={styles.headSection}>
        <div className="ml-auto">
          <DocLink tag={tag}>
            {tag} <IconLink className="inline" />
          </DocLink>
        </div>
      </div>
    </div>
  )
}

function FontName({ font }: HasFont) {
  const name = font.getName(NameId.FontFamilyName)
  return <h1 className="text-lg">{name}</h1>
}

function GlyphCount({ font }: HasFont) {
  return <Text.Tertiary>{font.numGlyphs} Glyphs</Text.Tertiary>
}

function FileSize({ font }: HasFont) {
  return (
    <Text.Tertiary title={`${font.size} Bytes`}>
      {sizeToString(font.size)}
    </Text.Tertiary>
  )
}

function DocLink({
  tag,
  children,
}: {
  tag: string
  children: React.ReactNode
}) {
  const url = `https://learn.microsoft.com/en-us/typography/opentype/spec/${tag}`
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-md inline-block px-2 py-4 text-[var(--color-text)]"
    >
      {children}
    </a>
  )
}
