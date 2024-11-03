export function registerShortcuts() {
  document.addEventListener('keydown', (e) => {
    handleShortcut(e)
  })
}

function handleShortcut(e: KeyboardEvent | React.KeyboardEvent) {
  const key = handle(e)
  switch (key.value) {
    case '⌘K':
      key.accept(() => {
        const rs = getRootSearch()
        rs.focus()
        rs.select()
      })
  }
}

const getRootSearch = getById<HTMLInputElement>('root.search')

function getById<T extends HTMLElement = HTMLElement>(id: string) {
  return () => document.getElementById(id) as T
}

export function handle(e: KeyboardEvent | React.KeyboardEvent) {
  const value = normalizeShortcut(e)
  const accept = (
    callback: (ctx: {
      metaKey: boolean
      ctrlKey: boolean
      altKey: boolean
      shiftKey: boolean
    }) => void,
  ) => {
    e.preventDefault()

    const ctx = {
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      shiftKey: e.shiftKey,
    }

    callback(ctx)
  }

  return { value, accept }
}

function normalizeShortcut(e: KeyboardEvent | React.KeyboardEvent) {
  let value = ''
  if (e.metaKey) value += '⌘'
  if (e.ctrlKey) value += '⌃'
  if (e.altKey) value += '⌥'
  if (e.shiftKey) value += '⇧'

  let key = e.key
  if (/^[a-z]$/.test(e.key)) {
    key = key.toUpperCase()
  }

  value += key

  return value
}
