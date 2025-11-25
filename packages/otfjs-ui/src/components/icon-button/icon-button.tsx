import clsx from 'clsx'
import styles from './icon-button.module.css'

export function IconButton({
  className,
  ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={clsx(styles.root, className)} />
}
