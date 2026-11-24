# tables

Every module in this directory is public API. `package.json` publishes each one as its own entry point, `otfjs/tables/<name>`, so consumers can import anything a module here exports:

```ts
import { HmtxTableReader } from 'otfjs/tables/hmtx'
import * as Cmap from 'otfjs/tables/cmap'
```

Each table module exports:

- `XTag`: the table's tag, e.g. `HmtxTag = 'hmtx'`.
- `XTableReader`: a `TableReader` to pass to `FontHandle.readTable`.
- `XTableWriter`: a `TableWriter`, if the table can be written.
- The table's types, and the lower-level `readXTable` / `writeXTable` functions the reader and writer wrap.

## Adding to this directory

- **Only add public modules.** Internal code lives outside `tables/`, for example `../header.ts`, `../default-readers.ts` and `../utils/table-data.ts`. If a table module needs a helper that consumers shouldn't use, put it in a module outside this directory rather than exporting it from here.
- **Define readers and writers as plain typed object literals**, not with factory functions. An unused object literal has no side effects, so bundlers drop it without any `/* @__PURE__ */` annotation.
- **Generated code:** `*.gen.ts` files are generated from `schema/` by `pnpm generate`. They, `schema/` and test files are excluded from the package's exports, so re-export what consumers need from the hand-written `<name>.ts` wrapper.

See `discussions/0002-injectable-table-readers-and-writers.md` for the reasoning behind this layout.
