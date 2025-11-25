const SIZE_UNITS = ['B', 'KB', 'MB', 'GB']
const SIZE_CONSTANT = 1024

export function sizeToString(size: number) {
  let unit = 0
  while (size >= SIZE_CONSTANT && unit < SIZE_UNITS.length - 1) {
    size /= SIZE_CONSTANT
    ++unit
  }

  return `${size.toFixed(1)} ${SIZE_UNITS[unit]}`
}
