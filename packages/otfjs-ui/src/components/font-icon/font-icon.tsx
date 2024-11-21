export interface FontIconProps {
  name: string
  size: number
}

export function FontIcon({ name, size }: FontIconProps) {
  const id = name.toLowerCase().replaceAll(' ', '-')
  return (
    <svg width={size} height={size} fill="var(--color-text)">
      <use href={`preview.svg#${id}`} />
    </svg>
  )
}
