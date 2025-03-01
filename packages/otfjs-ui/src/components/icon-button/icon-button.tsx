import styles from './icon-button.module.css'

export function IconButton(props: React.HTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={styles.root} />
}
