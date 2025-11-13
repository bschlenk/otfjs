export function Secondary(props: React.HTMLProps<HTMLSpanElement>) {
  return (
    <span {...props} className="text-sm text-(--color-text-secondary)" />
  )
}

export function Tertiary(props: React.HTMLProps<HTMLSpanElement>) {
  return (
    <span {...props} className="text-xs text-(--color-text-tertiary)" />
  )
}
