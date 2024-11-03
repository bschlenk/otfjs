import { tw } from '../../../utils/tw'

export interface SearchBarProps {
  onChange: (value: string) => void
}

export function SearchBar({ onChange }: SearchBarProps) {
  return (
    <Contents>
      <input
        className="min-w-64 rounded-full border border-white px-3 py-1"
        onChange={(e) => onChange(e.currentTarget.value)}
      />
    </Contents>
  )
}

const Contents = tw`sticky top-0 flex`
