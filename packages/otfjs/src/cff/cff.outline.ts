import { PathRecorder } from '../path-recorder.js'
import type { CffTable } from '../tables/cff.js'
import type { CffOutline } from '../types.js'
import { runCharString } from './cff.charstring.js'

/**
 * Run a glyph's charstring to get its outline. Also returns the advance
 * width the charstring gives, which should match hmtx.
 */
export function readCffOutline(
  cff: CffTable,
  id: number,
): { outline: CffOutline; width: number } {
  const priv = cff.privateDicts[cff.fdSelect?.[id] ?? 0]
  const recorder = new PathRecorder()

  const width = runCharString(
    cff.charStrings.get(id),
    {
      globalSubrs: cff.globalSubrs,
      localSubrs: priv.subrs,
      defaultWidthX: priv.defaultWidthX,
      nominalWidthX: priv.nominalWidthX,
    },
    recorder,
  )

  return {
    outline: { type: 'cff', ...recorder.bounds(), commands: recorder.commands },
    width,
  }
}
