import JsonViewPkg from '@uiw/react-json-view'
import { darkTheme } from '@uiw/react-json-view/dark'

const theme: React.CSSProperties = {
  ...(darkTheme as React.CSSProperties),
  '--w-rjv-font-family': '"Cascadia Code", monospace',
  '--w-rjv-background-color': 'transparent',
}

export function JsonView({
  data,
  replacements,
}: {
  data: object
  replacements?: Record<string, (value: unknown) => any>
}) {
  if (replacements) {
    data = structuredClone(data)
    for (const [key, replace] of Object.entries(replacements)) {
      if (key in data) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        ;(data as any)[key] = replace((data as any)[key])
      }
    }
  }

  return <JsonViewPkg value={data} style={theme} displayDataTypes={false} />
}
