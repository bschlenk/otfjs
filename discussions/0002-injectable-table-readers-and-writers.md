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
function readerFor<T>(tag: string, read: (view: Reader, font: FontHandle) => T): TableReader<T>
function writerFor<T>(tag: string, write: (data: T) => Uint8Array): TableWriter<T>
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

### FontHandle API

```ts
class FontHandle {
  readTable<T>(reader: TableReader<T>): T        // throws if tag not in font
  readTableOrNull<T>(reader: TableReader<T>): T | null
  writeTable<T>(writer: TableWriter<T>, data: T): Uint8Array

  getTable(tag: string): unknown                 // string convenience; not tree-shakeable
}
```

`readTable` and `writeTable` are the primary API — explicitly verbed, reader/writer objects carry the tag. `getTable(tag)` stays as a convenience for REPLs and devtools where tree-shaking doesn't matter because nothing is sent over the wire.

The cache key is `reader.tag`. Cross-table dependencies are expressed naturally: the reader calls `font.readTable(hheaTableReader)` internally, so only the tables actually needed are parsed.

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

## Open questions

**`TableMap` type**

The `TableMap` interface (mapping tag strings to parsed types) becomes unnecessary once the return type is inferred from the reader. It may still be useful as documentation or for `getTable`'s return type, but the typed path no longer needs it.

## Current state (as of 0002)

Not yet implemented. `FontHandle` still owns a switch-based `readTable()` that imports all table readers. The proposal above describes the target architecture.
