import { Reader } from '../buffer/reader.js'
import { Writer } from '../buffer/writer.js'
import { error } from '../utils/utils.js'

/**
 * Decode WOFF2 hmtx transform 1.
 * 
 * The hmtx transform stores horizontal metrics in a more compact format:
 * - A flags byte indicating which data is present
 * - An array of advance widths for the first numHMetrics glyphs
 * - An array of left side bearings (either explicit or derived from x_mins)
 * 
 * @see https://www.w3.org/TR/WOFF2/#hmtx_table_format
 */
export function decodeHmtxTransform1(
  buff: Uint8Array,
  numGlyphs: number,
  numHMetrics: number,
  xMins: number[],
): Uint8Array {
  const view = new Reader(buff)

  // Read flags byte
  const flags = view.u8()

  // Bit 0: if 0, proportional LSBs are present in the data (read them)
  //        if 1, proportional LSBs are omitted (use x_mins instead)
  // Bit 1: if 0, monospace LSBs are present in the data (read them)
  //        if 1, monospace LSBs are omitted (use x_mins instead)
  // Bits 2-7: reserved, must be 0
  const hasProportionalLsbs = (flags & 0x01) === 0
  const hasMonospaceLsbs = (flags & 0x02) === 0

  // Validate reserved bits
  if ((flags & 0xfc) !== 0) {
    error('Invalid hmtx flags: bits 2-7 must be 0')
  }

  // At least one LSB array must be omitted (replaced by x_mins)
  if (hasProportionalLsbs && hasMonospaceLsbs) {
    error('Invalid hmtx transform: both LSB arrays present')
  }

  if (xMins.length !== numGlyphs) {
    error(
      `x_mins array size mismatch: expected ${numGlyphs}, got ${xMins.length}`,
    )
  }

  if (numHMetrics < 1) {
    error('numHMetrics must be at least 1')
  }

  if (numHMetrics > numGlyphs) {
    error('numHMetrics cannot exceed numGlyphs')
  }

  // Read advance widths for the first numHMetrics glyphs
  const advanceWidths: number[] = []
  for (let i = 0; i < numHMetrics; i++) {
    advanceWidths.push(view.u16())
  }

  // Read or derive left side bearings for proportional glyphs
  const lsbs: number[] = []
  for (let i = 0; i < numHMetrics; i++) {
    if (hasProportionalLsbs) {
      lsbs.push(view.i16())
    } else {
      lsbs.push(xMins[i])
    }
  }

  // Read or derive left side bearings for monospace glyphs
  for (let i = numHMetrics; i < numGlyphs; i++) {
    if (hasMonospaceLsbs) {
      lsbs.push(view.i16())
    } else {
      lsbs.push(xMins[i])
    }
  }

  // Write the reconstructed hmtx table
  return writeHmtxTable(numGlyphs, numHMetrics, advanceWidths, lsbs)
}

/**
 * Write hmtx table in standard OpenType format.
 * 
 * Format:
 * - For first numHMetrics glyphs: uint16 advanceWidth, int16 lsb
 * - For remaining glyphs: int16 lsb only (advance width is repeated from last)
 */
function writeHmtxTable(
  numGlyphs: number,
  numHMetrics: number,
  advanceWidths: number[],
  lsbs: number[],
): Uint8Array {
  const writer = new Writer()

  // Write longHorMetric records (advance width + lsb)
  for (let i = 0; i < numHMetrics; i++) {
    writer.u16(advanceWidths[i])
    writer.i16(lsbs[i])
  }

  // Write remaining lsb values only
  for (let i = numHMetrics; i < numGlyphs; i++) {
    writer.i16(lsbs[i])
  }

  return writer.toBuffer()
}
