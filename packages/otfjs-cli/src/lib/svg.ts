import render from 'dom-serializer'
import { type ChildNode, DomHandler, type Element } from 'domhandler'
import { Parser } from 'htmlparser2'

export type { Element }

export function parseSvg(html: string): ChildNode[] {
  let err: Error | null = null
  let dom: ChildNode[] | null = null

  const parser = new Parser(
    new DomHandler((_err, _dom) => {
      err = _err
      dom = _dom
    }),
    { xmlMode: true },
  )
  parser.write(html)
  parser.end()

  if (err) throw err

  return dom!
}

export function stringifySvg(dom: ChildNode[]) {
  return render(dom)
}
