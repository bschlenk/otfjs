export function Secondary(props: React.HTMLProps<HTMLSpanElement>) {
  return (
    <span {...props} className="text-sm text-[var(--color-text-secondary)]" />
  )
}

export function Tertiary(props: React.HTMLProps<HTMLSpanElement>) {
  return (
    <span {...props} className="text-sm text-[var(--color-text-tertiary)]" />
  )
}
