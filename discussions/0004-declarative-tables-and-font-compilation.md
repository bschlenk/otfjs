# 0004 — Declarative table definitions and font compilation

## Background

0002 gave every table a `TableReader` and, where one exists, a `TableWriter`. Two questions came out of that work:

1. Many tables (`CPAL`, `COLR`, `GPOS`, `CFF `, `cvt `, `fpgm`, `prep`) have no writer, and most of them can't be described with `@otfjs/buffer-gen`. Should buffer-gen grow until it can describe them, and is there an existing declarative approach to build on?
2. Some tables can't be written in isolation. Writing `glyf` decides what goes in `loca`, and the loca format has to match `head.indexToLocFormat`. Glyph data also feeds the bounding box in `head`, the maximums in `maxp`, and the left side bearings in `hmtx`. Where does that cross-table logic live, given that a `TableWriter` only sees its own table?

## How other libraries do it

Surveyed November 2026 by reading each repository's source on GitHub. Points not verified from source are marked as such.

### fontations (Rust; Google's `read-fonts` / `write-fonts`; MIT or Apache-2.0)

The most declarative of the three. Tables are described in a small definition language (`resources/codegen_inputs/*.rs`, Rust tokens processed by a generator) that emits both reading and writing code. There are 54 table definitions, covering almost the whole spec: cmap, the layout tables (GSUB, GPOS, GDEF), COLR, CPAL, name, post, OS/2, the variation tables, and CFF/CFF2.

Exceptions:

- `loca` has no definition and is hand-written.
- `glyf` is defined only down to `glyph_data: [u8]`; the coordinates are decoded by hand. glyf is read-only in the generator, and the glyf and loca writers are hand-written.
- About 16 tables have read-only definitions (glyf, svg, the bitmap tables, kern, the AAT tables).
- Unverified: how much of the CFF support is generated rather than hand-written, and whether write-fonts has a combined `GlyfLocaBuilder`.

The language's main features:

- **Offsets:** `subtable_offset: Offset32<CmapSubtable>`, with `#[nullable]` for optional ones.
- **Counts:** from a field (`#[count($num_tables)]`), computed (`#[count(half($seg_count_x2))]`), to the end of the table (`#[count(..)] data: [u8]`), or a literal.
- **Format dispatch:** `format u16 CmapSubtable { Format0(Cmap0), Format4(Cmap4), … }`, or `#[match_if($format < 0)]` for glyf's simple-versus-composite split.
- **Versions and flags:** `#[since_version(1)]` for fields added in later versions, `#[if_flag($flags, X)]` for fields present only when a flag is set.
- **Values from other tables:** `#[read_args(num_glyphs: u16)]`.
- **Fields derived on write:** `#[compile(array_len($records))] num_tables: u16` recomputes counts and lengths instead of trusting stored values.
- **Escape hatches:** `#[read_with]`, `#[compile_with]` and `#[skip_font_write]`, so one awkward part of a table doesn't force the whole table to be hand-written.

### fontTools (Python)

- **Declarative:** the layout-style tables (GSUB, GPOS, GDEF, MATH, COLR, the AAT tables, and others) are rows in one large data file, `otData.py`. Simple tables like head and hhea use struct format strings.
- **Hand-written:** glyf, loca, cmap, name, the bodies of post's formats, kern, and CFF (a separate library, `cffLib`).
- **Cross-table logic lives in the tables.** Each table's `compile(font)` receives the whole font. Compiling glyf updates loca, loca picks its format from the offsets, and options like `recalcBBoxes` update head, maxp and hhea at save time.
- **Writing offsets** builds a tree of writers, shares identical subtables, and has a recovery path for 16-bit offset overflow in large GSUB/GPOS tables.

### fontkit (JavaScript, with the restructure struct library; MIT)

- **Declarative:** most tables, using restructure, which interprets struct definitions at runtime and supports offsets for both reading and writing.
- **Hand-written:** glyf decoding (`src/glyph/TTFGlyph.js`) and CFF (`src/cff/`, which wasn't opened to confirm whether it uses restructure).
- **loca** is declarative but needs hooks that halve or double the offsets for the short format.
- **Writing** only happens through the subsetter, which writes glyf as raw glyph bytes.

### What they have in common

No library is fully declarative. The same pieces are hand-written everywhere:

- **glyf coordinates:** flags with repeat counts, and coordinates that are 1 or 2 bytes depending on those flags.
- **CFF:** a different encoding entirely.
- **loca:** its format comes from another table.
- **Usually also:** cmap lookup logic, name string decoding, and post glyph names.

## Decision

### Extend buffer-gen, using fontations as the design reference

We won't adopt any of these directly:

- **fontations** generates Rust.
- **restructure** is JS and MIT-licensed, but it interprets definitions at runtime, so there are no generated TypeScript types, and it relies on getters for laziness. That loses buffer-gen's typed interfaces and plain functions that can be tree-shaken.

buffer-gen already covers structs, versioned variants, additive versions (fontations' `since_version`), flags, arrays counted by a field, fixed values, reserved fields, and byte blocks. These are the features to add, in order:

1. **Count to end of table, and values passed in from other tables.** Generates cvt, fpgm and prep, and lets hmtx and loca be generated without hand-written wrappers.
2. **Offsets (16- and 32-bit, nullable) and format dispatch.** CPAL, then cmap (replacing the hand-written version), then COLR v0.
3. **Flag-conditional fields, computed counts, fields derived on write, and escape hatches.** The glyf glyph header and composite components, leaving only coordinate encoding hand-written, which is the same split fontations makes.
4. **Later:** COLR v1 paints and GPOS.

Writing offsets is the hard part. A simple writer that lays out each subtable after its parent is fine for CPAL, cmap and COLR v0. GPOS will eventually need subtable sharing and 16-bit offset overflow handling like fontTools has, which is one reason it comes last.

Generated code plugs into the existing `TableReader` / `TableWriter` layer: buffer-gen supplies more of the read and write functions behind the same reader and writer objects.

### Three layers for writing fonts

1. **Codec layer (0002).** A `TableReader` or `TableWriter` converts one table to or from bytes and recalculates nothing: a writer writes the table object it's given. Tables without a writer, or that weren't changed, pass through as their original bytes (`FontHandle.getTableView`), which is how fontTools treats tables it doesn't understand.
2. **Compile / derive layer.** Free functions that take higher-level data and return a consistent set of table objects. They live in `fns/`, one per file, so consumers only pay for what they import. This is fontTools' cross-table logic, made explicit and separately importable instead of hidden inside each table's `compile`. The first one is `compileGlyfLoca(glyphs)`, which returns the glyf bytes, the loca offsets, and the `indexToLocFormat` that head must use. Recalculating head's bounding box, the maxp maximums, and hmtx left side bearings belong here too.
3. **Assembly layer.** `buildFont` takes the final bytes for each table and writes the sfnt table directory and checksums.

### glyf and loca

- `GlyfTable` is `Glyph[]`, the raw form with composite glyphs intact; it's what the glyf writers take. `getGlyph` stays the way to read glyphs: one at a time, returning flattened `GlyphEnriched` glyphs.
- There is no `GlyfTableReader` for now. Decoding every glyph up front is the wrong default when nearly every caller wants a few glyphs, and `Font.getTable('glyf')` would make that easy to do by accident. The planned replacement is a lazy, cached reader: `GlyfTable` becomes `{ numGlyphs, get(id) }`, keeping the raw bytes and decoding a glyph only when it's asked for, as fontTools does. `getGlyph` would then use it and gain per-glyph caching, and the writer could pass through the bytes of glyphs that were never decoded.
- `GlyfTableWriter` fits `TableWriter<Glyph[]>`. 0002 originally said glyf couldn't fit `write(data: T)`. That was a statement about the old `writeGlyfTable(glyphs, loca)` signature, not about the table.
- `LocaTable` stays `number[]` (byte offsets). The format is an encoding detail derived from the offsets, as in fontTools: `LocaTableWriter` uses the short format whenever the offsets allow it, and `locaFormatFor(offsets)` tells callers what to put in `head.indexToLocFormat`. Code that must keep a specific format, such as WOFF2 decoding, calls `writeLocaTable(offsets, format)` directly.
- Code building a font should call `compileGlyfLoca`, which encodes each glyph once and returns both tables together, instead of calling the two writers separately.

## Current state

- **Implemented:** the glyf/loca part of the decision (`GlyfTableWriter`, `LocaTableWriter`, `locaFormatFor`, `compileGlyfLoca`). WOFF2 decoding uses `compileGlyfLoca` with the format from the WOFF2 header. Checked locally on 600 fonts: reading every glyph, recompiling glyf and loca, and rebuilding the font gives back identical glyphs.
- **Not started:** the lazy glyf reader, the buffer-gen extensions, and the other compile/derive functions.
