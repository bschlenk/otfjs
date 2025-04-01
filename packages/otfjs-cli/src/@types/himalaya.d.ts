declare module 'himalaya' {
  export interface Attribute {
    key: string
    value: string | null
  }

  export interface Element {
    type: 'element'
    tagName: string
    children: Node[]
    attributes: Attribute[]
  }

  export interface Comment {
    type: 'comment'
    content: string
  }

  export interface Text {
    type: 'text'
    content: string
  }

  export type Node = Element | Comment | Text

  export function parse(str: string, options?: any): Node[]
  export function stringify(elements: Node[]): string
}
