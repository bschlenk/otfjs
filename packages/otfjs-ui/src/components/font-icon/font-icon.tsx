import complexFontsArray from '../../fonts-complex.json'

import styles from './font-icon.module.css'

export interface FontIconProps {
  name: string
  size: number
}

const complexFonts = new Set(complexFontsArray)

export function FontIcon({ name, size }: FontIconProps) {
  const id = name.toLowerCase().replaceAll(' ', '-')

  if (complexFonts.has(id)) {
    return (
      <img
        src={`${id}.svg`}
        width={size}
        height={size}
        className={styles.imgPreview}
      />
    )
  }

  return (
    <svg width={size} height={size} fill="var(--color-text)">
      <use href={`preview.svg#${id}`} />
    </svg>
  )
}
