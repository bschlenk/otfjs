import type { TableReader } from '../table-reader.js'
import { type CffTable, CffTableReader } from './cff.js'
import { type CmapTable, CmapTableReader } from './cmap.js'
import { type ColrTable, ColrTableReader } from './colr.js'
import { type CpalTable, CpalTableReader } from './cpal.js'
import { type CvtTable, CvtTableReader } from './cvt.js'
import { type FpgmTable, FpgmTableReader } from './fpgm.js'
import { type GposTable, GposTableReader } from './gpos.js'
import { type HeadTable, HeadTableReader } from './head.js'
import { type HheaTable, HheaTableReader } from './hhea.js'
import { type HmtxTable, HmtxTableReader } from './hmtx.js'
import { type LocaTable, LocaTableReader } from './loca.js'
import { type MathTable, MathTableReader } from './math.js'
import { type MaxpTable, MaxpTableReader } from './maxp.js'
import { type NameTable, NameTableReader } from './name.js'
import { type OS2Table, OS2TableReader } from './os-2.js'
import { type PostTable, PostTableReader } from './post.js'
import { type PrepTable, PrepTableReader } from './prep.js'

/**
 * Maps each table tag that has a built-in reader to its parsed type.
 */
export interface TableMap {
  'CFF ': CffTable
  cmap: CmapTable
  COLR: ColrTable
  CPAL: CpalTable
  'cvt ': CvtTable
  fpgm: FpgmTable
  GPOS: GposTable
  head: HeadTable
  hhea: HheaTable
  hmtx: HmtxTable
  loca: LocaTable
  MATH: MathTable
  maxp: MaxpTable
  name: NameTable
  'OS/2': OS2Table
  post: PostTable
  prep: PrepTable
}

/**
 * Every built-in table reader, keyed by tag. Used by the string-based
 * `Font.getTable` convenience. Importing this pulls in every reader, so
 * code that cares about bundle size should import individual readers
 * instead.
 */
export const defaultReaders: {
  [K in keyof TableMap]: TableReader<TableMap[K]>
} = {
  'CFF ': CffTableReader,
  cmap: CmapTableReader,
  COLR: ColrTableReader,
  CPAL: CpalTableReader,
  'cvt ': CvtTableReader,
  fpgm: FpgmTableReader,
  GPOS: GposTableReader,
  head: HeadTableReader,
  hhea: HheaTableReader,
  hmtx: HmtxTableReader,
  loca: LocaTableReader,
  MATH: MathTableReader,
  maxp: MaxpTableReader,
  name: NameTableReader,
  'OS/2': OS2TableReader,
  post: PostTableReader,
  prep: PrepTableReader,
}
