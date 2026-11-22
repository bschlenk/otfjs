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
  read(view: Reader, font: FontHandle): T
}

interface TableWriter<T> {
  readonly tag: string
  write(data: T): Uint8Array
}
```

### Factory functions

Two factory functions — `readerFor` and `writerFor` — are the one consistent way to define readers and writers across the codebase. They take the tag as the first argument, eliminating the need to write it twice:

```ts
function readerFor<T>(
  tag: string,
  read: (view: Reader, font: FontHandle) => T,
): TableReader<T>
function writerFor<T>(
  tag: string,
  write: (data: T) => Uint8Array,
): TableWriter<T>
```

### Per-table objects

Each table file exports a tag constant plus reader, writer, and optionally a combined object:

```ts
// tables/hmtx.ts
export const HmtxTag = 'hmtx' as const

export const HmtxTableReader = readerFor<HmtxTable>(HmtxTag, (view, font) => {
  const { numberOfHMetrics } = font.readTable(HheaTableReader)
  const { numGlyphs } = font.readTable(MaxpTableReader)
  return readHmtxTable(view, numberOfHMetrics, numGlyphs)
})

export const HmtxTableWriter = writerFor<HmtxTable>(HmtxTag, writeHmtxTable)

// Combined export for consumers who need both
export const HmtxTable = { ...HmtxTableReader, ...HmtxTableWriter }
```

Importing only `HmtxTableReader` tree-shakes out the writer, and vice versa. `HmtxTable` is the "full" concept for consumers who don't need to split them. The exported `HmtxTag` constant can also be used with the string-based `getTable` convenience.

The combined object is only exported for tables that have both a reader and a writer. Read-only tables (`CFF `, `COLR`, `CPAL`, `GPOS`, `loca`, …) export just `XTag` and `XTableReader`. This also sidesteps a name clash for tables whose parsed type is still a class (`ColrTable`, `CpalTable`): a class can't share its name with a `const`, but an interface can.

`glyf` and `loca` don't get `TableWriter`s. Their writers need extra context (`writeGlyfTable(glyphs, loca)`, `writeLocaTable(offsets, indexFormat)`), so they don't fit `write(data: T)`. They stay plain functions in `writers/`.

The generated tables (`head`, `hhea`, `maxp`, `OS/2`, `post`, `MATH`) define their reader/writer objects in the hand-written wrapper module (`tables/head.ts`) that re-exports the generated code, rather than in the generated file itself. `@otfjs/buffer-gen` is a generic binary codegen and shouldn't know about `FontHandle` or `readerFor`.

### FontHandle API

```ts
class FontHandle {
  readTable<T>(reader: TableReader<T>): T // throws if tag not in font
  readTableOrNull<T>(reader: TableReader<T>): T | null
  writeTable<T>(writer: TableWriter<T>, data: T): Uint8Array

  hasTable(tag: string): boolean
  getTableRecord(tag: string): TableRecord | undefined
  getTableView(tag: string): Reader | null // raw bytes for tables read lazily, like glyf
}
```

`readTable` and `writeTable` are the primary API — explicitly verbed, reader/writer objects carry the tag. `FontHandle` imports no table readers at all.

The cache is keyed by **reader identity**, not by `reader.tag`. Keying by tag would let a custom reader for, say, `cmap` and the built-in `CmapTableReader` share a cache slot and hand back each other's results. Cross-table dependencies are expressed naturally: the reader calls `font.readTable(HheaTableReader)` internally, so only the tables actually needed are parsed.

### String-based convenience on `Font`

```ts
class Font extends FontHandle {
  getTable<T extends string>(tag: T): TableType<T> // throws if not present or no reader
  getTableOrNull<T extends string>(tag: T): TableType<T> | null
}
```

`getTable(tag)` is a convenience for REPLs, devtools, and the UI, where tree-shaking doesn't matter. It lives on `Font`, not `FontHandle`: putting it on the handle would require the handle to import every reader again, which is exactly the problem this discussion solves. `Font` looks the tag up in `tables/default-readers.ts` (tag → built-in reader) and calls `readTable`, so it shares the cache with the typed path. `Font` is already the "batteries included" class — it imports every free function — so pulling in every reader there is consistent.

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

A namespace object (`Hmtx.Tag`, `Hmtx.Reader`) would give both, but importing the object defeats reader/writer tree-shaking since bundlers can only eliminate at the module export level, not the property level.

If tag discoverability becomes a real need, a `tables/tags.ts` barrel that re-exports all tag constants solves it without changing the naming scheme.

## `TableMap` type

Kept, as the return type of `Font.getTable(tag)`. The typed path (`readTable(reader)`) infers its return type from the reader and doesn't need it, but dropping it would make `getTable` return `unknown` and break every untyped-but-convenient call site (`font.getTable('head').unitsPerEm`). It's types-only, so it has no runtime or bundle cost.

## Current state

In progress on the `bschlenk/injectable-table-readers` branch.
