import { IconSearch } from '../../icons/icon-search'

import styles from './search-bar.module.css'

export interface SearchBarProps {
  onChange: (value: string) => void
}

export function SearchBar({ onChange }: SearchBarProps) {
  return (
    <div className={styles.container}>
      <input
        id="root.search"
        className={styles.input}
        placeholder="Search"
        onChange={(e) => onChange(e.currentTarget.value)}
      />
      <div aria-hidden="true" className={styles.overlay}>
        <IconSearch className={styles.icon} />
        <Shortcut value="⌘K" />
      </div>
    </div>
  )
}

function Shortcut({ value }: { value: string }) {
  return <kbd className={styles.shortcut}>{value}</kbd>
}
