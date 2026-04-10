# @otfjs/buffer

Tools for reading data from font file tables into objects.

## Usage

Create an interface using the types from this package. Most types are just aliases for `number`, but the type names instruct the parser generator on how to read or write the values.

```ts
interface HeadTable {
  majorVersion: t.u16
  minorVersion: t.u16
  fontRevision: t.u32
  ...
}
```

The parser generator will generate two functions associated with this interface, a reader and a writer:

```ts
function readHeadTable(r: Reader) {
  const majorVersion = r.u16()
  const minorVersion = r.u16()
  const fontRevision = r.u32()

  return {
    majorVersion,
    minorVersion,
    fontRevision,
  }
}

function writeHeadTable(w: Writer, data: HeadTable): Uint8Array {
  const w = new Writer(8)

  w.u16(data.majorVersion)
  w.u16(data.minorVersion)
  w.u32(data.fontRevision)

  return w.toBuffer()
}
```
