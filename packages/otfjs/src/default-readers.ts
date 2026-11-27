import type { TableReader } from './table-reader.js'
import { CffTableReader } from './tables/cff.js'
import { CmapTableReader } from './tables/cmap.js'
import { ColrTableReader } from './tables/colr.js'
import { CpalTableReader } from './tables/cpal.js'
import { CvtTableReader } from './tables/cvt.js'
import { FpgmTableReader } from './tables/fpgm.js'
import { GlyfTableReader } from './tables/glyf.js'
import { GposTableReader } from './tables/gpos.js'
import { HeadTableReader } from './tables/head.js'
import { HheaTableReader } from './tables/hhea.js'
import { HmtxTableReader } from './tables/hmtx.js'
import { LocaTableReader } from './tables/loca.js'
import { MathTableReader } from './tables/math.js'
import { MaxpTableReader } from './tables/maxp.js'
import { MetaTableReader } from './tables/meta.js'
import { NameTableReader } from './tables/name.js'
import { OS2TableReader } from './tables/os-2.js'
import { PostTableReader } from './tables/post.js'
import { PrepTableReader } from './tables/prep.js'

/**
 * Every built-in table reader, keyed by tag, for the string-based
 * `Font.getTable`. Importing this pulls in every reader; to keep bundles
 * small, import the readers you need instead.
 */
export const defaultReaders = {
  'CFF ': CffTableReader,
  cmap: CmapTableReader,
  COLR: ColrTableReader,
  CPAL: CpalTableReader,
  'cvt ': CvtTableReader,
  fpgm: FpgmTableReader,
  glyf: GlyfTableReader,
  GPOS: GposTableReader,
  head: HeadTableReader,
  hhea: HheaTableReader,
  hmtx: HmtxTableReader,
  loca: LocaTableReader,
  MATH: MathTableReader,
  maxp: MaxpTableReader,
  meta: MetaTableReader,
  name: NameTableReader,
  'OS/2': OS2TableReader,
  post: PostTableReader,
  prep: PrepTableReader,
} satisfies Record<string, TableReader<unknown>>

/** Maps each tag with a built-in reader to the type its reader returns. */
export type TableMap = {
  [K in keyof typeof defaultReaders]: (typeof defaultReaders)[K] extends (
    TableReader<infer T>
  ) ?
    T
  : never
}
