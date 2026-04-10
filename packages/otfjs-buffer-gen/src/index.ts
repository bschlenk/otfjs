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

// ---- Types ----------------------------------------------------------------

type ScalarField = { kind: 'scalar'; type: string }
type CountedArrayField = { kind: 'counted-array'; elementType: string; countField: string }
type FieldInfo = ScalarField | CountedArrayField

// ---- Parsing --------------------------------------------------------------

async function parseFile(filePath: string) {
  const file = await fs.readFile(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(
    filePath,
    file,
    ts.ScriptTarget.Latest,
    true,
  )

  const interfaces: Record<string, Record<string, FieldInfo>> = {}

  sourceFile.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node)) {
      const interfaceName = node.name.text
      const members: Record<string, FieldInfo> = {}

      node.forEachChild((member) => {
        if (
          ts.isPropertySignature(member) &&
          ts.isIdentifier(member.name) &&
          member.type
        ) {
          const name = member.name.text
          const field = resolveType(member.type)

          if (field) {
            members[name] = field
          }
        }
      })

      interfaces[interfaceName] = members
    }
  })

  return interfaces
}

function resolveType(type: ts.TypeNode): FieldInfo | null {
  if (!ts.isTypeReferenceNode(type)) return null

  const name = resolveTypeName(type)
  if (!name) return null

  if (name === 'CountedArray' && type.typeArguments?.length === 2) {
    const elementType = resolveTypeName(type.typeArguments[0])
    const countField = resolveStringLiteral(type.typeArguments[1])

    if (elementType && countField) {
      return { kind: 'counted-array', elementType, countField }
    }
  }

  return { kind: 'scalar', type: name }
}

function resolveTypeName(type: ts.TypeNode): string | null {
  if (!ts.isTypeReferenceNode(type)) return null

  if (ts.isIdentifier(type.typeName)) {
    return type.typeName.text
  }

  if (
    ts.isQualifiedName(type.typeName) &&
    ts.isIdentifier(type.typeName.right)
  ) {
    return type.typeName.right.text
  }

  return null
}

function resolveStringLiteral(type: ts.TypeNode): string | null {
  if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
    return type.literal.text
  }
  return null
}

// ---- Code generation ------------------------------------------------------

function genReader(name: string, members: Record<string, FieldInfo>) {
  const fnName = `read${name}`

  const lines = Object.entries(members).map(([memberName, field]) => {
    if (field.kind === 'counted-array') {
      const readElement = isPrimitive(field.elementType)
        ? `(r) => r.${field.elementType}()`
        : `(r) => read${field.elementType}(r)`
      return `  const ${memberName} = r.array(${field.countField}, ${readElement})`
    }
    if (!isPrimitive(field.type)) {
      return `  const ${memberName} = read${field.type}(r)`
    }
    return `  const ${memberName} = r.${typeToFn(field.type)}()`
  })

  const returnFields = Object.keys(members)
    .map((memberName) => `    ${memberName},`)
    .join('\n')

  return `\
import type { Reader } from '@otfjs/buffer'

export function ${fnName}(r: Reader): ${name} {
${lines.join('\n')}

  return {
${returnFields}
  }
}`
}

function genWriter(name: string, members: Record<string, FieldInfo>) {
  const fnName = `write${name}`
  const size = Object.values(members)
    .map((field) => (field.kind === 'scalar' ? typeToSize(field.type) : 0))
    .reduce((a, b) => a + b, 0)

  const lines = Object.entries(members).map(([memberName, field]) => {
    if (field.kind === 'counted-array') {
      const writeElement = isPrimitive(field.elementType)
        ? `w.${field.elementType}(item)`
        : `write${field.elementType}(w, item)`
      return `  for (const item of d.${memberName}) {\n    ${writeElement}\n  }`
    }
    if (!isPrimitive(field.type)) {
      return `  write${field.type}(w, d.${memberName})`
    }
    return `  w.${typeToFn(field.type)}(d.${memberName})`
  })

  return `\
import { Writer } from '@otfjs/buffer'

export function ${fnName}(d: ${name}): Uint8Array {
  const w = new Writer(${size})

${lines.join('\n')}

  return w.toBuffer()
}`
}

// ---- Helpers ---------------------------------------------------------------

const PRIMITIVES = new Set([
  'u8', 'i8', 'u16', 'i16', 'u24', 'u32', 'i32', 'i64',
  'f2dot14', 'f16dot16', 'tag', 'Date',
  'u16225', 'uBase128',
])

function isPrimitive(type: string): boolean {
  return PRIMITIVES.has(type)
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
