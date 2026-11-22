import path from 'node:path'

import { build } from 'esbuild'
import { describe, expect, it } from 'vitest'

const pkgDir = path.resolve(import.meta.dirname, '..')

/**
 * Bundle a snippet that imports from the package entry point and return
 * the output. Dependencies are left external so the output contains only
 * this package's code.
 */
async function bundle(contents: string) {
  const result = await build({
    stdin: { contents, resolveDir: pkgDir, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'neutral',
    external: ['@otfjs/*', '@bschlenk/*', 'brotli', 'brotli/*'],
    logLevel: 'silent',
  })
  return result.outputFiles[0].text
}

const ALL_READ_FUNCTIONS = [
  'readCffTable',
  'readCmapTable',
  'readColrTable',
  'readCpalTable',
  'readGposTable',
  'readHeadTable',
  'readHheaTable',
  'readHmtxTable',
  'readLocaTable',
  'readMathTable',
  'readMaxpTable',
  'readNameTable',
  'readOS2Table',
  'readPostTable',
]

function expectOnly(code: string, included: string[], all: string[]) {
  for (const name of all) {
    if (included.includes(name)) {
      expect(code, `expected ${name} in bundle`).toContain(name)
    } else {
      expect(code, `expected ${name} not in bundle`).not.toContain(name)
    }
  }
}

describe('tree-shaking', () => {
  it('getGlyphIndex pulls in only the cmap reader', async () => {
    const code = await bundle(`
      import { FontHandle, getGlyphIndex } from './src/index.ts'
      export default (data) => getGlyphIndex(new FontHandle(data), 65)
    `)

    expectOnly(code, ['readCmapTable'], ALL_READ_FUNCTIONS)
    expect(code).not.toContain('writeCmapTable')
    expect(code).not.toContain('defaultReaders')
  })

  it('getGlyph pulls in only loca, hmtx, and their dependencies', async () => {
    const code = await bundle(`
      import { FontHandle, getGlyph } from './src/index.ts'
      export default (data) => getGlyph(new FontHandle(data), 0)
    `)

    expectOnly(
      code,
      [
        'readLocaTable',
        'readHmtxTable',
        'readHeadTable',
        'readHheaTable',
        'readMaxpTable',
      ],
      ALL_READ_FUNCTIONS,
    )
    expect(code).not.toMatch(/write\w+Table/)
  })

  it('importing a reader does not pull in its writer, and vice versa', async () => {
    const reader = await bundle(`
      import { HmtxTableReader } from './src/index.ts'
      export default HmtxTableReader
    `)
    expect(reader).toContain('readHmtxTable')
    expect(reader).not.toContain('writeHmtxTable')

    const writer = await bundle(`
      import { HmtxTableWriter } from './src/index.ts'
      export default HmtxTableWriter
    `)
    expect(writer).toContain('writeHmtxTable')
    expect(writer).not.toContain('readHmtxTable')
  })

  it('Font pulls in every reader', async () => {
    const code = await bundle(`
      import { Font } from './src/index.ts'
      export default Font
    `)
    expectOnly(code, ALL_READ_FUNCTIONS, ALL_READ_FUNCTIONS)
  })
})
