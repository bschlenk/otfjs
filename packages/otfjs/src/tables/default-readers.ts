import type { TableReader } from '../table-reader.js'
import { CffTableReader } from './cff.js'
import { CmapTableReader } from './cmap.js'
import { ColrTableReader } from './colr.js'
import { CpalTableReader } from './cpal.js'
import { CvtTableReader } from './cvt.js'
import { FpgmTableReader } from './fpgm.js'
import { GposTableReader } from './gpos.js'
import { HeadTableReader } from './head.js'
import { HheaTableReader } from './hhea.js'
import { HmtxTableReader } from './hmtx.js'
import { LocaTableReader } from './loca.js'
import { MathTableReader } from './math.js'
import { MaxpTableReader } from './maxp.js'
import { NameTableReader } from './name.js'
import { OS2TableReader } from './os-2.js'
import { PostTableReader } from './post.js'
import { PrepTableReader } from './prep.js'

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
} satisfies Record<string, TableReader<unknown>>

/** Maps each tag with a built-in reader to the type its reader returns. */
export type TableMap = {
  [K in keyof typeof defaultReaders]: (typeof defaultReaders)[K] extends (
    TableReader<infer T>
  ) ?
    T
  : never
}
