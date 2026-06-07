# 0001 — Font handle and free functions

## Background

As we move tables from classes to plain data interfaces, a question arises about where higher-level operations live — functions that span one or more tables but aren't raw parse/write logic.

The current `Font` class mixes two concerns:

1. **Table caching** — holds the buffer, parsed header, and a lazy cache that parses tables on demand via `getTable()`.
2. **Higher-level operations** — `getGlyph`, `getName`, `numGlyphs`, `glyphs`, `validate`, etc., which touch one or more tables to answer a question.

## Decision

Split into two layers:

**`FontHandle`** — a concrete base class. Owns the buffer, parsed header, and table cache. Exposes `getTable`, `getTableOrNull`, `hasTable`, and the low-level getters (`data`, `size`, `sfntVersion`, `tables`). This is the minimal thing a consumer needs to hand to a free function.

**`Font extends FontHandle`** — adds the ergonomic method shell. Each method is a one-liner that delegates to the corresponding free function, passing `this`. No logic lives here.

**Free functions** — typed against `FontHandle`, colocated by concern in a `fns/` directory (not colocated with the table they happen to touch). Each file contains one function, and the file name is kebab-cased function name.

```
src/
  font-handle.ts
  font.ts
  fns/
    index.ts
    get-glyph-index.ts   ← getGlyphIndex(font: FontHandle, codePoint: number)
    get-glyph.ts         ← getGlyph(font: FontHandle, id: number)
    get-name.ts          ← getName(font: FontHandle, nameId: NameId, ...)
    ...
```

## Why

- **Tree-shaking** — consumers who import only `getGlyphIndex` pay for only that function and its transitive deps. Importing `Font` costs nothing extra because its methods are one-liners.
- **Testability** — free functions can be tested by constructing a minimal `FontHandle` stub without standing up a full `Font`.
- **Honesty** — `Font extends FontHandle` is an "is-a" relationship that holds: a `Font` is strictly a superset of a `FontHandle`. "Has-a" would imply independent lifecycles, which isn't the case here.
- **No redundant naming** — `FontHandle` is a concrete class, not an interface, so no `IFontHandle` gymnastics needed.

## Current state (as of 0001)

The handle logic is already implicit inside `Font`. `getGlyphIndex` has been extracted as a free function but is currently in `tables/cmap.ts` and typed against `CmapTable` rather than `FontHandle`. The full split is planned as a separate branch after the table writers are complete.
