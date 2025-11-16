export type FontSource = 'google' | 'local'

export interface FontSourceSelectorProps {
  value: FontSource
  onChange: (source: FontSource) => void
}

export function FontSourceSelector({
  value,
  onChange,
}: FontSourceSelectorProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border-(1 --color-border) bg-(--color-bg) p-1">
      <button
        type="button"
        onClick={() => onChange('google')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          value === 'google'
            ? 'bg-(--color-border-selected) text-(--color-text)'
            : 'text-(--color-text-secondary) hover:text-(--color-text)'
        }`}
      >
        Google
      </button>
      <button
        type="button"
        onClick={() => onChange('local')}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          value === 'local'
            ? 'bg-(--color-border-selected) text-(--color-text)'
            : 'text-(--color-text-secondary) hover:text-(--color-text)'
        }`}
      >
        Local
      </button>
    </div>
  )
}
