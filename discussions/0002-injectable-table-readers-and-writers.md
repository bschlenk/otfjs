# 0002 — Injectable table readers and writers

## Background

After implementing the `FontHandle` / free-functions split (see 0001), a second tree-shaking problem surfaced. `FontHandle.readTable()` contains a switch over every known table tag, so it must statically import every table reader. A consumer who only calls `getGlyphIndex` still pays for the readers for `head`, `hhea`, `hmtx`, `loca`, `MATH`, `OS/2`, `post`, and every other table, even though none of them are reachable from that code path.

The root cause is that the handle _owns_ the parsing logic. Tree-shaking cannot eliminate dead readers because they are all imported by a single switch statement that is always reachable from `FontHandle`.

## Decision

Invert the dependency: the handle becomes a dumb typed cache; parsing and serialization logic lives in small standalone objects — **readers** and **writers** — that are passed into the handle at call time.

### Interfaces

```ts
interface TableReader<T> {
  readonly tag: string
  read: (view: Reader, font: FontHandle) => T
}

interface TableWriter<T> {
  readonly tag: string
  write: (data: T) => Uint8Array
}
```

`read` and `write` are function-typed properties rather than methods: the objects are plain data, and method syntax trips `@typescript-eslint/unbound-method` wherever `reader.read` is passed around.

### Per-table objects

Each table module exports a tag constant, a reader, and a writer where one exists, written as plain typed object literals:

```ts
// tables/hmtx.ts
export const HmtxTag = 'hmtx'

export const HmtxTableReader: TableReader<HmtxTable> = {
  tag: HmtxTag,
  read: (view, font) => {
    const { numberOfHMetrics } = font.readTable(HheaTableReader)
    const { numGlyphs } = font.readTable(MaxpTableReader)
    return readHmtxTable(view, numberOfHMetrics, numGlyphs)
  },
}

export const HmtxTableWriter: TableWriter<HmtxTable> = {
  tag: HmtxTag,
  write: writeHmtxTable,
}
```

An unused object literal has no side effects, so bundlers drop it without any annotation. An earlier version defined these with `readerFor(tag, read)` / `writerFor(tag, write)` factories. Those calls had to be marked `/* @__PURE__ */` at every call site, because esbuild ignores `@__NO_SIDE_EFFECTS__` on a function defined in another module, and the factories only saved writing the tag twice.

There is no combined reader-and-writer object. Each table module is published as its own entry point, `otfjs/tables/<name>`, so a consumer who wants everything for a table can write `import * as Hmtx from 'otfjs/tables/hmtx'`. Bundlers still drop whichever of `Hmtx.HmtxTableReader` / `Hmtx.HmtxTableWriter` is unused, since static member access on a namespace import is tree-shaken like a named import.

Tables don't need both halves. Read-only tables (`CFF `, `COLR`, `CPAL`, `GPOS`, `cvt `, `fpgm`, `prep`, `loca`) export just `XTag` and `XTableReader`. `glyf` has no reader object: glyphs are read one at a time with `getGlyph`. Writing glyf and loca, which must be done together, is a follow-up.

The generated tables (`head`, `hhea`, `maxp`, `OS/2`, `post`, `MATH`) define their reader/writer objects in the hand-written wrapper module (`tables/head.ts`) that re-exports the generated code, rather than in the generated file itself. `@otfjs/buffer-gen` is a generic binary codegen and shouldn't know about `FontHandle` or `TableReader`.

### Public API and entry points

The main `otfjs` entry doesn't re-export tables; they're imported from `otfjs/tables/<name>`. `Font` already gives string-based access to every table, so the main entry stays focused on fonts and free functions.

Modules that are `export *`'d, from the main entry or as a table entry point, contain only public API. `package.json` exposes `src/tables/` with a single `./tables/*` pattern, so every module in that directory is public. Internal modules live elsewhere (`header.ts`, `default-readers.ts`, `utils/table-data.ts`), and `null` patterns exclude the generated `*.gen` files, the `schema/` sources and compiled tests.

### FontHandle API

```ts
class FontHandle {
  readTable<T>(reader: TableReader<T>): T // throws if tag not in font
  readTableOrNull<T>(reader: TableReader<T>): T | null

  hasTable(tag: string): boolean
  getTableRecord(tag: string): TableRecord | undefined
  getTableView(tag: string): Reader // throws if tag not in font
  getTableViewOrNull(tag: string): Reader | null
}
```

`readTable` is the primary API: it's explicitly verbed, and the reader object carries the tag. `getTableView` gives raw bytes for tables read lazily, like glyf. `FontHandle` imports no table readers at all.

There's no `writeTable` on the handle. It would only call `writer.write(data)` without changing the font, so it added nothing. Producing a modified font is a separate, higher-level step.

The cache is keyed by **reader identity**, not by `reader.tag`. Keying by tag would let a custom reader for, say, `cmap` and the built-in `CmapTableReader` share a cache slot and hand back each other's results. A missing table is cached as `null`. The cache treats only `undefined` as a miss, so a lookup is a single `Map.get` either way, with no separate `has` check. Cross-table dependencies are expressed naturally: the reader calls `font.readTable(HheaTableReader)` internally, so only the tables actually needed are parsed.

### String-based convenience on `Font`

```ts
class Font extends FontHandle {
  getTable<T extends string>(tag: T): TableType<T> // throws if not present or no reader
  getTableOrNull<T extends string>(tag: T): TableType<T> | null
}
```

`getTable(tag)` is a convenience for REPLs, devtools, and the UI, where tree-shaking doesn't matter. It lives on `Font`, not `FontHandle`: putting it on the handle would require the handle to import every reader again, which is exactly the problem this discussion solves. `Font` looks the tag up in `default-readers.ts` (tag → built-in reader) and calls `readTable`, so it shares the cache with the typed path. `Font` is already the "batteries included" class — it imports every free function — so pulling in every reader there is consistent.

### Free functions

Each free function imports only the readers it actually needs:

```ts
// fns/get-glyph.ts
import { HmtxTableReader } from '../tables/hmtx.js'
import { LocaTableReader } from '../tables/loca.js'

export function getGlyph(font: FontHandle, id: number): GlyphEnriched {
  const loca = font.readTable(LocaTableReader)
  const hmtx = font.readTable(HmtxTableReader)
  ...
}
```

Custom tables are first-class: any plain object satisfying `TableReader<T>` or `TableWriter<T>` works with no registration step.

## Naming convention

Exports use name-first (`HmtxTag`, `HmtxTableReader`, `HmtxTableWriter`) so that `Hmtx<tab>` in an editor shows everything related to a given table. Type-first (`TagHmtx`) would make all tags discoverable via `Tag<tab>` but is unusual in TypeScript codebases and makes concept-grouping harder.

If tag discoverability becomes a real need, a `tables/tags.ts` module that re-exports all tag constants solves it without changing the naming scheme.

## `TableMap` type

Kept, as the return type of `Font.getTable(tag)`, and derived from the reader registry in `default-readers.ts` rather than maintained by hand. The typed path (`readTable(reader)`) infers its return type from the reader and doesn't need it, but dropping it would make `getTable` return `unknown` and break every untyped-but-convenient call site (`font.getTable('head').unitsPerEm`). It's types-only, so it has no runtime or bundle cost.

## Current state

Implemented. `FontHandle` imports no table modules; every table module exports `XTag`, `XTableReader`, and `XTableWriter` where a writer exists; `Font.getTable` goes through `default-readers.ts`.

`src/tree-shaking.test.ts` bundles small entry points with esbuild and asserts which readers and writers end up in the output. Bundling only `getGlyphIndex` + `FontHandle` (minified, dependencies external) went from 23.0 KB to 4.2 KB.

Bundlers drop whole unused table modules only if they honor `"sideEffects": false` from `package.json` (esbuild, webpack, and Vite/rollup with node-resolve all do). Without it, the initializers for TypeScript `enum`s in unreachable modules survive, though their readers are still dropped.
