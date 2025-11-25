import JsonViewPkg from '@uiw/react-json-view'
import { darkTheme } from '@uiw/react-json-view/dark'

const theme: React.CSSProperties = {
  ...darkTheme,
  '--w-rjv-font-family': '"Cascadia Code", monospace',
  '--w-rjv-background-color': 'transparent',
}

export function JsonView({
  data,
  /* replacements, */
}: {
  data: object
  replacements?: Record<string, (value: unknown) => any>
}) {
  /*
  const replacer = useMemo(() => {
    if (!replacements) return undefined

    return (key: string, value: any): any => {
      const r = replacements[key]
      if (r) return r(value)
      return value
    }
  }, [replacements])
  */

  return <JsonViewPkg value={data} style={theme} displayDataTypes={false} />
}
