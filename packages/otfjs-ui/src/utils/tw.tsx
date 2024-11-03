// TODO: can this do tw.input`...`?
export function tw(strings: TemplateStringsArray) {
  const className = strings[0]

  return function Tw(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div {...props} className={className} />
  }
}
