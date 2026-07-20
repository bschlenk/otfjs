import fs from 'node:fs/promises'
import path from 'node:path'

import { glob } from 'tinyglobby'

import type {
  AdditiveDef,
  AdditiveTier,
  ArrayDef,
  FieldDef,
  FlagsDef,
  PrimitiveDef,
  PrimitiveType,
  StructDef,
  VersionedDef,
  VersionedVariant,
} from './schema.js'

function generatedHeader(sourceFile: string) {
  return `\
// This file is auto-generated from ${sourceFile}.
// Run \`pnpm generate\` to regenerate. Do not edit manually.
`
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

async function run() {
  const pattern = process.argv[2]
  const outDir = process.argv[3]

  if (!pattern) {
    console.error('Usage: buffer-gen <glob-pattern> [output-dir]')
    process.exit(1)
  }

  const files = await glob(pattern)

  for (const file of files) {
    await processFile(file, outDir)
  }
}

async function processFile(filePath: string, outDir?: string) {
  const module = await loadFile(filePath)

  const flagsDefs: FlagsDef[] = []
  const structDefs: StructDef[] = []
  const versionedDefs: VersionedDef[] = []
  const additiveDefs: AdditiveDef[] = []
  const seen = new Set<string>()

  for (const value of Object.values(module)) {
    if (!isSchemaValue(value) || seen.has(value.name)) continue
    seen.add(value.name)
    if (value.kind === 'flags') flagsDefs.push(value)
    else if (value.kind === 'struct') structDefs.push(value)
    else if (value.kind === 'versioned') versionedDefs.push(value)
    else if (value.kind === 'additive') additiveDefs.push(value)
  }

  // Also collect any inline FlagsDefs from struct fields not separately exported
  const allStructs = [
    ...structDefs,
    ...versionedDefs.flatMap((v) => v.variants.map((vv) => vv.struct)),
  ]
  for (const struct of allStructs) {
    for (const field of Object.values(struct.fields)) {
      if (field.kind === 'flags' && !seen.has(field.name)) {
        seen.add(field.name)
        flagsDefs.push(field)
      }
    }
  }

  if (
    flagsDefs.length === 0 &&
    structDefs.length === 0 &&
    versionedDefs.length === 0 &&
    additiveDefs.length === 0
  ) {
    return
  }

  const blocks: string[] = []

  for (const def of flagsDefs) {
    blocks.push(
      genFlagsInterface(def),
      genFlagsReader(def),
      genFlagsWriter(def),
    )
  }

  for (const def of structDefs) {
    blocks.push(
      genStructInterface(def),
      genStructReader(def),
      genStructWriter(def),
    )
  }

  for (const def of versionedDefs) {
    blocks.push(genVersionedCode(def))
  }

  for (const def of additiveDefs) {
    blocks.push(genAdditiveCode(def))
  }

  const generated =
    generatedHeader(path.relative(process.cwd(), filePath)) +
    `import { type Reader, Writer } from '@otfjs/buffer'\n` +
    `\n` +
    blocks.join('\n\n') +
    `\n`

  const baseName = path.basename(filePath).replace(/\.ts$/, '.gen.ts')
  const outPath =
    outDir ? path.join(outDir, baseName) : filePath.replace(/\.ts$/, '.gen.ts')

  const existing = await fs.readFile(outPath, 'utf8').catch(() => null)
  if (existing !== generated) {
    await fs.writeFile(outPath, generated)
    console.log(`generated ${path.relative(process.cwd(), outPath)}`)
  }
}

function loadFile(filePath: string): Promise<Record<string, unknown>> {
  return import(path.resolve(filePath))
}

// ---- Type guards ------------------------------------------------------------

function isSchemaValue(
  v: unknown,
): v is StructDef | FlagsDef | VersionedDef | AdditiveDef {
  return (
    typeof v === 'object' &&
    v !== null &&
    'kind' in v &&
    'name' in v &&
    ((v as { kind: unknown }).kind === 'struct' ||
      (v as { kind: unknown }).kind === 'flags' ||
      (v as { kind: unknown }).kind === 'versioned' ||
      (v as { kind: unknown }).kind === 'additive')
  )
}

// ---- Flags generation -------------------------------------------------------

function genFlagsInterface(def: FlagsDef) {
  const fields = Object.keys(def.bits)
    .map((name) => `  ${name}: boolean`)
    .join('\n')
  return `export interface ${def.name} {\n${fields}\n}`
}

function genFlagsReader(def: FlagsDef) {
  const fields = Object.entries(def.bits)
    .map(([name, bit]) => `    ${name}: !!(v & (1 << ${bit})),`)
    .join('\n')
  return `\
export function read${def.name}(r: Reader): ${def.name} {
  const v = r.${typeToFn(def.type)}()
  return {
${fields}
  }
}`
}

function genFlagsWriter(def: FlagsDef) {
  const terms = Object.entries(def.bits)
    .map(([name, bit]) => `    (d.${name} ? (1 << ${bit}) : 0)`)
    .join(' |\n')
  return `\
export function write${def.name}(d: ${def.name}): number {
  return (
${terms}
  )
}`
}

// ---- Struct generation ------------------------------------------------------

function getCountFields(fields: Record<string, FieldDef>): Set<string> {
  const countFields = new Set<string>()
  for (const field of Object.values(fields)) {
    if (field.kind === 'array') countFields.add(field.countField)
  }
  return countFields
}

function validateArrayFields(def: StructDef) {
  const fieldNames = Object.keys(def.fields)
  for (const [name, field] of Object.entries(def.fields)) {
    if (field.kind !== 'array') continue
    const countIdx = fieldNames.indexOf(field.countField)
    const arrayIdx = fieldNames.indexOf(name)
    if (countIdx === -1) {
      throw new Error(
        `${def.name}.${name}: count field '${field.countField}' not found`,
      )
    }
    if (countIdx >= arrayIdx) {
      throw new Error(
        `${def.name}.${name}: count field '${field.countField}' must come before the array`,
      )
    }
    const countFieldDef = def.fields[field.countField]
    if (countFieldDef.kind !== 'primitive') {
      throw new Error(
        `${def.name}.${name}: count field '${field.countField}' must be a primitive`,
      )
    }
  }
}

function genStructInterface(def: StructDef) {
  validateArrayFields(def)
  const countFields = getCountFields(def.fields)
  const fields = Object.entries(def.fields)
    .filter(
      ([name, field]) =>
        field.kind !== 'reserved' &&
        field.kind !== 'fixed' &&
        !countFields.has(name),
    )
    .map(([name, field]) => {
      const doc = 'doc' in field && field.doc ? `  /** ${field.doc} */\n` : ''
      return `${doc}  ${name}: ${fieldToTs(field)}`
    })
    .join('\n')
  return `export interface ${def.name} {\n${fields}\n}`
}

function genStructReader(def: StructDef) {
  const countFields = getCountFields(def.fields)
  const lines = Object.entries(def.fields).map(([name, field]) => {
    if (field.kind === 'reserved') return `  r.skip(${field.bytes})`
    if (field.kind === 'fixed') {
      const val = formatValue(field.value)
      return `  if (r.${typeToFn(field.type)}() !== ${val}) throw new Error('${name}: expected ${val}')`
    }
    if (field.kind === 'bytes') {
      return `  const ${name} = r.u8Array(${field.count})`
    }
    if (field.kind === 'array') {
      return `  const ${name} = r.array(${field.countField}, ${genArrayElementReader(field)})`
    }
    if (field.kind === 'flags') return `  const ${name} = read${field.name}(r)`
    if (field.kind === 'struct') return `  const ${name} = read${field.name}(r)`
    return `  const ${name} = r.${typeToFn(field.type)}()`
  })

  const returnFields = Object.entries(def.fields)
    .filter(
      ([name, field]) =>
        field.kind !== 'reserved' &&
        field.kind !== 'fixed' &&
        !countFields.has(name),
    )
    .map(([name]) => `    ${name},`)
    .join('\n')

  return `\
export function read${def.name}(r: Reader): ${def.name} {
${lines.join('\n')}

  return {
${returnFields}
  }
}`
}

function genArrayElementReader(field: ArrayDef): string {
  const { element } = field
  if (element.kind === 'primitive') {
    return `(r) => r.${typeToFn(element.type)}()`
  }
  if (element.kind === 'flags') return `read${element.name}`
  return `read${element.name}`
}

function genStructWriter(def: StructDef) {
  const countFields = getCountFields(def.fields)
  const size = computeWriterSize(def.fields, 0)

  const lines = Object.entries(def.fields).map(([name, field]) => {
    if (field.kind === 'reserved') return `  w.skip(${field.bytes})`
    if (field.kind === 'bytes') return `  w.buffer(d.${name})`
    if (field.kind === 'fixed') {
      return `  w.${typeToFn(field.type)}(${formatValue(field.value)})`
    }
    if (field.kind === 'array') {
      return `  for (const item of d.${name}) {\n    ${genArrayElementWriter(field)}\n  }`
    }
    if (field.kind === 'flags') {
      return `  w.${typeToFn(field.type)}(write${field.name}(d.${name}))`
    }
    if (field.kind === 'struct') return `  write${field.name}(w, d.${name})`
    if (countFields.has(name)) {
      return `  w.${typeToFn((field as { type: PrimitiveType }).type)}(d.${getArrayForCountField(name, def.fields)}.length)`
    }
    return `  w.${typeToFn(field.type)}(d.${name})`
  })

  const writerInit = size === null ? `new Writer()` : `new Writer(${size})`
  return `\
export function write${def.name}(d: ${def.name}): Uint8Array {
  const w = ${writerInit}

${lines.join('\n')}

  return w.toBuffer()
}`
}

function getArrayForCountField(
  countFieldName: string,
  fields: Record<string, FieldDef>,
): string {
  for (const [name, field] of Object.entries(fields)) {
    if (field.kind === 'array' && field.countField === countFieldName) {
      return name
    }
  }
  throw new Error(`No array field found for count field '${countFieldName}'`)
}

function genArrayElementWriter(field: ArrayDef): string {
  const { element } = field
  if (element.kind === 'primitive') return `w.${typeToFn(element.type)}(item)`
  if (element.kind === 'flags') {
    return `w.${typeToFn(element.type)}(write${element.name}(item))`
  }
  return `write${element.name}(w, item)`
}

// ---- Versioned generation ---------------------------------------------------

function genVersionedCode(def: VersionedDef) {
  const interfaces = def.variants.map((v) =>
    genVariantInterface(v, def.versionType),
  )
  const unionType = `export type ${def.name} = ${def.variants.map((v) => v.struct.name).join(' | ')}`
  const reader = genVersionedReader(def)
  const writer = genVersionedWriter(def)
  return [...interfaces, unionType, reader, writer].join('\n\n')
}

function genVariantInterface(
  variant: VersionedVariant,
  versionType: PrimitiveType,
) {
  const versionHex = formatVersionHex(variant.version, versionType)
  const countFields = getCountFields(variant.struct.fields)
  const fields = Object.entries(variant.struct.fields)
    .filter(
      ([name, field]) =>
        field.kind !== 'reserved' &&
        field.kind !== 'fixed' &&
        !countFields.has(name),
    )
    .map(([name, field]) => {
      const doc = 'doc' in field && field.doc ? `  /** ${field.doc} */\n` : ''
      return `${doc}  ${name}: ${fieldToTs(field)}`
    })
    .join('\n')
  return `export interface ${variant.struct.name} {\n  version: ${versionHex}\n${fields}\n}`
}

function genVersionedReader(def: VersionedDef) {
  const cases = def.variants.map((v) => {
    const versionHex = formatVersionHex(v.version, def.versionType)
    const lines = Object.entries(v.struct.fields).map(([name, field]) => {
      if (field.kind === 'reserved') return `      r.skip(${field.bytes})`
      if (field.kind === 'fixed') {
        const val = formatValue(field.value)
        return `      if (r.${typeToFn(field.type)}() !== ${val}) throw new Error('${name}: expected ${val}')`
      }
      if (field.kind === 'bytes') {
        return `      const ${name} = r.u8Array(${field.count})`
      }
      if (field.kind === 'flags') {
        return `      const ${name} = read${field.name}(r)`
      }
      if (field.kind === 'struct') {
        return `      const ${name} = read${field.name}(r)`
      }
      if (field.kind === 'array') {
        return `      const ${name} = r.array(${field.countField}, ${genArrayElementReader(field)})`
      }
      return `      const ${name} = r.${typeToFn(field.type)}()`
    })
    const countFields = getCountFields(v.struct.fields)
    const returnFields = Object.entries(v.struct.fields)
      .filter(
        ([name, field]) =>
          field.kind !== 'reserved' &&
          field.kind !== 'fixed' &&
          !countFields.has(name),
      )
      .map(([name]) => `        ${name},`)
      .join('\n')
    return `    case ${versionHex}: {\n${lines.join('\n')}\n      return {\n        version,\n${returnFields}\n      }\n    }`
  })

  return `\
export function read${def.name}(r: Reader): ${def.name} {
  const version = r.${typeToFn(def.versionType)}()
  switch (version) {
${cases.join('\n')}
    default:
      throw new Error(\`Unknown ${def.name} version: 0x\${version.toString(16).toUpperCase()}\`)
  }
}`
}

function genVersionedWriter(def: VersionedDef) {
  const cases = def.variants.map((v) => {
    const versionHex = formatVersionHex(v.version, def.versionType)
    const countFields = getCountFields(v.struct.fields)
    const size = computeWriterSize(
      v.struct.fields,
      primitiveSize(def.versionType),
    )
    const lines = Object.entries(v.struct.fields).map(([name, field]) => {
      if (field.kind === 'reserved') return `      w.skip(${field.bytes})`
      if (field.kind === 'bytes') return `      w.buffer(d.${name})`
      if (field.kind === 'fixed') {
        return `      w.${typeToFn(field.type)}(${formatValue(field.value)})`
      }
      if (field.kind === 'flags') {
        return `      w.${typeToFn(field.type)}(write${field.name}(d.${name}))`
      }
      if (field.kind === 'struct') {
        return `      write${field.name}(w, d.${name})`
      }
      if (field.kind === 'array') {
        return `      for (const item of d.${name}) {\n        ${genArrayElementWriter(field)}\n      }`
      }
      if (countFields.has(name)) {
        return `      w.${typeToFn((field as { type: PrimitiveType }).type)}(d.${getArrayForCountField(name, v.struct.fields)}.length)`
      }
      return `      w.${typeToFn(field.type)}(d.${name})`
    })
    const writerInit = size === null ? `new Writer()` : `new Writer(${size})`
    return `    case ${versionHex}: {\n      const w = ${writerInit}\n      w.${typeToFn(def.versionType)}(d.version)\n${lines.join('\n')}\n      return w.toBuffer()\n    }`
  })

  return `\
export function write${def.name}(d: ${def.name}): Uint8Array {
  switch (d.version) {
${cases.join('\n')}
    default:
      throw new Error(\`Unknown ${def.name} version\`)
  }
}`
}

function formatVersionHex(value: number, type: PrimitiveType): string {
  const digits = primitiveSize(type) * 2
  return `0x${value.toString(16).toUpperCase().padStart(digits, '0')}`
}

// ---- Additive generation ----------------------------------------------------

function genAdditiveCode(def: AdditiveDef) {
  return [
    genAdditiveInterface(def),
    genAdditiveReader(def),
    genAdditiveWriter(def),
  ].join('\n\n')
}

function genAdditiveInterface(def: AdditiveDef) {
  const blocks: string[] = []

  // Unexported tier field interfaces
  for (const tier of def.tiers) {
    const fields = Object.entries(tier.fields)
      .filter(([, f]) => f.kind !== 'reserved' && f.kind !== 'fixed')
      .map(([name, field]) => {
        const doc = 'doc' in field && field.doc ? `  /** ${field.doc} */\n` : ''
        return `${doc}  ${name}: ${fieldToTs(field)}`
      })
      .join('\n')
    blocks.push(`interface ${def.name}Tier${tier.minVersion} {\n${fields}\n}`)
  }

  // Exported variant interfaces — each extends all tiers up to and including its own
  for (let i = 0; i < def.tiers.length; i++) {
    const tier = def.tiers[i]
    const nextTier = def.tiers[i + 1]
    const versionType = genVersionType(tier.minVersion, nextTier?.minVersion)
    const extendsClause = def.tiers
      .slice(0, i + 1)
      .map((t) => `${def.name}Tier${t.minVersion}`)
      .join(', ')
    blocks.push(
      `export interface ${def.name}V${tier.minVersion} extends ${extendsClause} {\n  version: ${versionType}\n}`,
    )
  }

  // Union type
  const union = def.tiers.map((t) => `${def.name}V${t.minVersion}`).join(' | ')
  blocks.push(`export type ${def.name} = ${union}`)

  return blocks.join('\n\n')
}

function genVersionType(minVersion: number, nextMinVersion?: number): string {
  if (nextMinVersion === undefined || nextMinVersion === minVersion + 1) {
    return String(minVersion)
  }
  const versions: number[] = []
  for (let v = minVersion; v < nextMinVersion; v++) versions.push(v)
  return versions.join(' | ')
}

function genAdditiveReader(def: AdditiveDef) {
  const baseTier = def.tiers[0]
  const laterTiers = def.tiers.slice(1)

  const baseLines = Object.entries(baseTier.fields).map(([name, field]) => {
    if (field.kind === 'reserved') return `  r.skip(${field.bytes})`
    if (field.kind === 'fixed') {
      const val = formatValue(field.value)
      return `  if (r.${typeToFn(field.type)}() !== ${val}) throw new Error('${name}: expected ${val}')`
    }
    return `  const ${name} = ${genFieldReadExpr(field, name)}`
  })

  const nullInits = laterTiers.flatMap((tier) =>
    Object.entries(tier.fields)
      .filter(([, f]) => f.kind !== 'reserved' && f.kind !== 'fixed')
      .map(([name, field]) => `  let ${name}: ${fieldToTs(field)} | undefined`),
  )

  const nestedIfs = genAdditiveReaderTiers(laterTiers, '  ')

  const allReturnFields = [
    'version',
    ...def.tiers.flatMap((tier) =>
      Object.entries(tier.fields)
        .filter(([, f]) => f.kind !== 'reserved' && f.kind !== 'fixed')
        .map(([name]) => name),
    ),
  ]
  const returnFields = allReturnFields.map((n) => `    ${n},`).join('\n')

  return `\
export function read${def.name}(r: Reader): ${def.name} {
  const version = r.${typeToFn(def.versionType)}()
${baseLines.join('\n')}
${nullInits.length ? nullInits.join('\n') + '\n' : ''}\
${nestedIfs}
  return {
${returnFields}
  } as ${def.name}
}`
}

function genAdditiveReaderTiers(tiers: AdditiveTier[], indent: string): string {
  if (tiers.length === 0) return ''
  const [tier, ...rest] = tiers
  const fieldLines = Object.entries(tier.fields).map(([name, field]) => {
    if (field.kind === 'reserved') return `${indent}  r.skip(${field.bytes})`
    if (field.kind === 'fixed') {
      const val = formatValue(field.value)
      return `${indent}  if (r.${typeToFn(field.type)}() !== ${val}) throw new Error('${name}: expected ${val}')`
    }
    return `${indent}  ${name} = ${genFieldReadExpr(field, name)}`
  })
  const inner = genAdditiveReaderTiers(rest, indent + '  ')
  const body = [...fieldLines, ...(inner ? [inner] : [])].join('\n')
  return `${indent}if (version >= ${tier.minVersion}) {\n${body}\n${indent}}`
}

function genFieldReadExpr(field: FieldDef, _name: string): string {
  if (field.kind === 'bytes') return `r.u8Array(${field.count})`
  if (field.kind === 'flags') return `read${field.name}(r)`
  if (field.kind === 'struct') return `read${field.name}(r)`
  if (field.kind === 'array') {
    return `r.array(${field.countField}, ${genArrayElementReader(field)})`
  }
  if (field.kind === 'primitive') return `r.${typeToFn(field.type)}()`
  return `r.${typeToFn((field as { type: PrimitiveType }).type)}()`
}

function genAdditiveWriter(def: AdditiveDef) {
  const baseTier = def.tiers[0]
  const laterTiers = def.tiers.slice(1)

  const baseSize =
    primitiveSize(def.versionType) +
    Object.values(baseTier.fields).reduce((s, f) => s + fieldSize(f), 0)
  const sizeLines = [`  let size = ${baseSize}`]
  for (const tier of laterTiers) {
    const tierSize = Object.values(tier.fields).reduce(
      (s, f) => s + fieldSize(f),
      0,
    )
    sizeLines.push(`  if (d.version >= ${tier.minVersion}) size += ${tierSize}`)
  }

  const baseWrites = Object.entries(baseTier.fields).map(
    ([name, field]) => `  ${genFieldWriteExpr(field, name)}`,
  )

  const nestedIfs = genAdditiveWriterTiers(laterTiers, '  ', def.name)

  return `\
export function write${def.name}(d: ${def.name}): Uint8Array {
${sizeLines.join('\n')}
  const w = new Writer(size)
  w.${typeToFn(def.versionType)}(d.version)
${baseWrites.join('\n')}
${nestedIfs}
  return w.toBuffer()
}`
}

function genAdditiveWriterTiers(
  tiers: AdditiveTier[],
  indent: string,
  defName: string,
): string {
  if (tiers.length === 0) return ''
  const [tier, ...rest] = tiers
  const varName = `d${tier.minVersion}`
  const castLine = `${indent}  const ${varName} = d as ${defName}V${tier.minVersion}`
  const fieldLines = Object.entries(tier.fields).map(
    ([name, field]) =>
      `${indent}  ${genFieldWriteExpr(field, name, false, varName)}`,
  )
  const inner = genAdditiveWriterTiers(rest, indent + '  ', defName)
  const body = [castLine, ...fieldLines, ...(inner ? [inner] : [])].join('\n')
  return `${indent}if (d.version >= ${tier.minVersion}) {\n${body}\n${indent}}`
}

function genFieldWriteExpr(
  field: FieldDef,
  name: string,
  nonNull = false,
  varName = 'd',
): string {
  const ref = nonNull ? `${varName}.${name}!` : `${varName}.${name}`
  if (field.kind === 'reserved') return `w.skip(${field.bytes})`
  if (field.kind === 'bytes') return `w.buffer(${ref})`
  if (field.kind === 'fixed') {
    return `w.${typeToFn(field.type)}(${formatValue(field.value)})`
  }
  if (field.kind === 'flags') {
    return `w.${typeToFn(field.type)}(write${field.name}(${ref}))`
  }
  if (field.kind === 'struct') return `write${field.name}(w, ${ref})`
  if (field.kind === 'array') {
    return `for (const item of ${ref}) {\n  ${genArrayElementWriter(field)}\n}`
  }
  return `w.${typeToFn(field.type)}(${ref})`
}

// ---- Helpers ----------------------------------------------------------------

function fieldToTs(field: FieldDef): string {
  if (field.kind === 'reserved') return 'never'
  if (field.kind === 'bytes') return 'Uint8Array'
  if (field.kind === 'flags') return field.name
  if (field.kind === 'struct') return field.name
  if (field.kind === 'array') return `${fieldToTs(field.element)}[]`
  return primitiveToTs(field.type)
}

function primitiveToTs(type: PrimitiveType): string {
  switch (type) {
    case 'i64':
      return 'bigint'
    case 'tag':
      return 'string'
    case 'Date':
      return 'Date'
    default:
      return 'number'
  }
}

function typeToFn(type: PrimitiveType): string {
  switch (type) {
    case 'Date':
      return 'date'
    default:
      return type
  }
}

function elementSize(el: PrimitiveDef | FlagsDef | StructDef): number {
  if (el.kind === 'struct') return 0
  return primitiveSize(el.type)
}

/** Returns a writer size: a number string if fully static, an expression string if dynamic, or null if unknown. */
function computeWriterSize(
  fields: Record<string, FieldDef>,
  baseSize: number,
): string | null {
  const fixedSize =
    baseSize + Object.values(fields).reduce((sum, f) => sum + fieldSize(f), 0)
  const arrayTerms: string[] = []

  for (const [name, field] of Object.entries(fields)) {
    if (field.kind !== 'array') continue
    const es = elementSize(field.element)
    if (es === 0) return null
    arrayTerms.push(`d.${name}.length * ${es}`)
  }

  if (arrayTerms.length === 0) return String(fixedSize)
  return [fixedSize, ...arrayTerms].join(' + ')
}

function fieldSize(field: FieldDef): number {
  if (field.kind === 'reserved') return field.bytes
  if (field.kind === 'bytes') return field.count
  if (field.kind === 'fixed') return primitiveSize(field.type)
  if (field.kind === 'flags') return primitiveSize(field.type)
  if (field.kind === 'struct') return 0
  if (field.kind === 'array') return 0
  return primitiveSize(field.type)
}

function formatValue(value: number | bigint | string): string {
  if (typeof value === 'bigint') return `${value}n`
  if (typeof value === 'string') return JSON.stringify(value)
  if (value > 0xff) return `0x${value.toString(16).toUpperCase()}`
  return String(value)
}

function primitiveSize(type: PrimitiveType): number {
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
    case 'tag':
      return 4
    case 'i64':
    case 'Date':
      return 8
    default:
      return 0
  }
}
