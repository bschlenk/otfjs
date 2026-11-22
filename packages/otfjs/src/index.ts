export * from './canvas.js'
export * from './enums.js'
export { NotAFontError } from './errors.js'
export * from './fns/index.js'
export * from './font.js'
export { FontHandle } from './font-handle.js'
export { disassemble } from './instruct/disassemble.js'
export { VirtualMachine } from './instruct/vm.js'
export * from './svg.js'
export { readerFor, type TableReader } from './table-reader.js'
export { type TableWriter, writerFor } from './table-writer.js'
export { type CffTable, CffTableReader, CffTag } from './tables/cff.js'
export {
  CmapTable,
  CmapTableReader,
  CmapTableWriter,
  CmapTag,
} from './tables/cmap.js'
export { type ColrTable, ColrTableReader, ColrTag } from './tables/colr.js'
export {
  type ColorLayer,
  type ColorLayerBase,
  type ColorRecordPropsMap,
  ColorRecordType,
  type ColorStop,
  CompositeMode,
} from './tables/colr.js'
export { type CpalTable, CpalTableReader, CpalTag } from './tables/cpal.js'
export { type CvtTable, CvtTableReader, CvtTag } from './tables/cvt.js'
export { defaultReaders, type TableMap } from './tables/default-readers.js'
export { type FpgmTable, FpgmTableReader, FpgmTag } from './tables/fpgm.js'
export { GlyfTag } from './tables/glyf.js'
export { type GposTable, GposTableReader, GposTag } from './tables/gpos.js'
export {
  type HeadFlags,
  HeadTable,
  HeadTableReader,
  HeadTableWriter,
  HeadTag,
  type MacStyle,
} from './tables/head.js'
export {
  HheaTable,
  HheaTableReader,
  HheaTableWriter,
  HheaTag,
} from './tables/hhea.js'
export {
  HmtxTable,
  HmtxTableReader,
  HmtxTableWriter,
  HmtxTag,
  type LongHorMetric,
} from './tables/hmtx.js'
export { type LocaTable, LocaTableReader, LocaTag } from './tables/loca.js'
export {
  MathTable,
  MathTableReader,
  MathTableWriter,
  MathTag,
} from './tables/math.js'
export {
  MaxpTable,
  type MaxpTable05,
  type MaxpTable10,
  MaxpTableReader,
  MaxpTableWriter,
  MaxpTag,
} from './tables/maxp.js'
export {
  type NameRecord,
  NameTable,
  NameTableReader,
  type NameTableV0,
  type NameTableV1,
  NameTableWriter,
  NameTag,
} from './tables/name.js'
export {
  OS2Table,
  OS2TableReader,
  type OS2TableV0,
  type OS2TableV1,
  type OS2TableV2,
  type OS2TableV5,
  OS2TableWriter,
  OS2Tag,
} from './tables/os-2.js'
export {
  PostTable,
  type PostTable01,
  type PostTable02,
  type PostTable03,
  PostTableReader,
  PostTableWriter,
  PostTag,
} from './tables/post.js'
export { type PrepTable, PrepTableReader, PrepTag } from './tables/prep.js'
export type * from './types.js'
export { isWoff2 } from './woff2/utils.js'
export { computeChecksum } from '@otfjs/buffer'
