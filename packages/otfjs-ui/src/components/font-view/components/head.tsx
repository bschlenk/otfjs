import { Link, useRouter } from '@tanstack/react-router'
import clsx from 'clsx'
import { NameId } from 'otfjs'

import { HasFont } from '../../../types/has-font'
import { sizeToString } from '../../../utils/bytes'
import { useFont } from '../../font-context'
import { FontIcon } from '../../font-icon/font-icon'
import { IconBack } from '../../icons/icon-back'
import { Text } from '../../text'

import styles from './head.module.css'

export function Head({ className }: { className?: string }) {
  const font = useFont()
  const name = font.getName(NameId.FontFamilyName)!

  return (
    <div className={clsx(styles.head, className)}>
      <div className="relative flex items-center overflow-hidden rounded-md bg-(--color-bg)">
        <FontIcon name={name} size={80} />
        <BackButton className="absolute inset-0 flex h-full w-full items-center justify-center opacity-0 hover:bg-(--color-bg) hover:opacity-100" />
      </div>
      <div className="flex flex-col justify-center">
        <FontName font={font} />
        <GlyphCount font={font} />
        <FileSize font={font} />
      </div>
    </div>
  )
}

function BackButton(props: { className?: string }) {
  const router = useRouter()

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault()
    router.history.back()
  }

  return (
    <Link {...props} to="/" onClick={handleBack}>
      <IconBack />
    </Link>
  )
}

function FontName({ font }: HasFont) {
  const name = font.getName(NameId.FontFamilyName)
  return <h1 className="mb-1 text-lg/5">{name}</h1>
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
