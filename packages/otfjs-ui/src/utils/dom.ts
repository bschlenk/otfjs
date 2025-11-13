export interface ElementWalker<T extends Element = Element> {
  currentNode: T
  readonly filter: (node: Element) => number
  readonly root: Element
  readonly whatToShow: typeof NodeFilter.SHOW_ELEMENT
  firstChild(): T | null
  lastChild(): T | null
  nextNode(): T | null
  nextSibling(): T | null
  parentNode(): T | null
  previousNode(): T | null
  previousSibling(): T | null
}

export function createElementWalkerFactory<T extends Element>(
  root: React.RefObject<Element | null>,
  predicate: (node: Element) => node is T,
) {
  return (start: T) => {
    const walker = createElementWalker(root.current!, predicate)
    walker.currentNode = start
    return walker
  }
}

export function createElementWalker<T extends Element>(
  root: Element,
  predicate: (node: Element) => node is T,
): ElementWalker<T>
export function createElementWalker(
  root: Element,
  predicate: (node: Element) => boolean,
): ElementWalker<Element>
export function createElementWalker(
  root: Element,
  predicate: (node: Element) => boolean,
): ElementWalker<any> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return document.createTreeWalker(
    root,
    1 /* NodeFilter.SHOW_ELEMENT */,
    (node) =>
      predicate(node as Element) ?
        1 /* NodeFilter.FILTER_ACCEPT */
      : 3 /* NodeFilter.FILTER_SKIP */,
  ) as unknown as ElementWalker<any>
}
