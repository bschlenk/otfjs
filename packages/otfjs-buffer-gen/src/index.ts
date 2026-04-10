import fs from 'node:fs/promises'

import * as ts from 'typescript'

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function run() {
  const file = process.argv[2]

  const interfaces = await parseFile(file)

  for (const [name, members] of Object.entries(interfaces)) {
    const reader = genReader(name, members)
    const writer = genWriter(name, members)

    console.log(reader)
    console.log()
    console.log(writer)
  }
}

async function parseFile(filePath: string) {
  const file = await fs.readFile(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    filePath,
    file,
    ts.ScriptTarget.Latest,
    true,
  )

  const interfaces: Record<string, Record<string, string>> = {}

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text
      const members: Record<string, string> = {}

      node.forEachChild((member) => {
        if (
          ts.isPropertySignature(member) &&
          ts.isIdentifier(member.name) &&
          member.type
        ) {
          const name = member.name.text
          const type = resolveType(member.type)

          if (type) {
            members[name] = type
          }
        }
      })

      interfaces[interfaceName] = members
    }
  })

  return interfaces
}

function resolveType(type: ts.TypeNode): string | null {
  if (ts.isTypeReferenceNode(type)) {
    if (ts.isIdentifier(type.typeName)) {
      return type.typeName.text
    }

    if (ts.isQualifiedName(type.typeName)) {
      if (ts.isIdentifier(type.typeName.right)) {
        return type.typeName.right.text
      }
    }
  }

  return null
}

function genReader(name: string, members: Record<string, string>) {
  const fnName = `read${name}`

  return `\
import type { Reader } from '@otfjs/buffer'

export function ${fnName}(r: Reader): ${name} {
${Object.entries(members)
  .map(
    ([memberName, memberType]) =>
      `  const ${memberName} = r.${typeToFn(memberType)}()`,
  )
  .join('\n')}

  return {
${Object.keys(members)
  .map((memberName) => `    ${memberName},`)
  .join('\n')}
  }
}
`
}

function genWriter(name: string, members: Record<string, string>) {
  const fnName = `write${name}`
  const size = Object.values(members)
    .map(typeToSize)
    .reduce((a, b) => a + b, 0)

  return `\
import { Writer } from '@otfjs/buffer'

export function ${fnName}(d: ${name}): void {
  const w = new Writer(${size})

${Object.entries(members)
  .map(
    ([memberName, memberType]) =>
      `  w.${typeToFn(memberType)}(d.${memberName})`,
  )
  .join('\n')}

  return w.toBuffer()
}
`
}

function typeToFn(type: string): string {
  switch (type) {
    case 'Date':
      return 'date'
    default:
      return type
  }
}

function typeToSize(type: string): number {
  switch (type) {
    case 'u8':
    case 'i8':
      return 1
    case 'u16':
    case 'i16':
    case 'f2dot14':
      return 2
    case 'u24':
      return 3
    case 'u32':
    case 'i32':
    case 'f16dot16':
      return 4
    case 'i64':
      return 8
    case 'tag':
      return 4
  }

  return 0
}
