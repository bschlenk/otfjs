import { fromLongDateTime, toHex } from '../utils.js'
import { Reader } from './buffer.js'

interface HeadTable {
  // Major version number of the font header table — set to 1.
  majorVersion: number
  // Minor version number of the font header table — set to 0.
  minorVersion: number
  // Fixed	fontRevision	Set by font manufacturer.
  fontRevision: string
  // To compute: set it to 0, sum the entire font as uint32, then store
  // 0xB1B0AFBA - sum. If the font is used as a component in a font collection
  // file, the value of this field will be invalidated by changes to the file
  // structure and font table directory, and must be ignored.
  checksumAdjustment: number
  // Set to 0x5F0F3CF5.
  magicNumber: string
  // See HeadTableFlags.
  flags: HeadTableFlags
  // Set to a value from 16 to 16384. Any value in this range is valid. In fonts
  // that have TrueType outlines, a power of 2 is recommended as this allows
  // performance optimizations in some rasterizers.
  unitsPerEm: number
  // Number of seconds since 12:00 midnight that started January 1st 1904 in GMT/UTC time zone.
  created: Date
  // Number of seconds since 12:00 midnight that started January 1st 1904 in GMT/UTC time zone.
  modified: Date
  // Minimum x coordinate across all glyph bounding boxes.
  xMin: number
  // Minimum y coordinate across all glyph bounding boxes.
  yMin: number
  // Maximum x coordinate across all glyph bounding boxes.
  xMax: number
  // Maximum y coordinate across all glyph bounding boxes.
  yMax: number
  // Bit 0: Bold (if set to 1);
  // Bit 1: Italic (if set to 1)
  // Bit 2: Underline (if set to 1)
  // Bit 3: Outline (if set to 1)
  // Bit 4: Shadow (if set to 1)
  // Bit 5: Condensed (if set to 1)
  // Bit 6: Extended (if set to 1)
  // Bits 7–15: Reserved (set to 0).
  macStyle: number
  // Smallest readable size in pixels.
  lowestRecPPEM: number
  // Deprecated (Set to 2).
  // 0: Fully mixed directional glyphs;
  // 1: Only strongly left to right;
  // 2: Like 1 but also contains neutrals;
  // -1: Only strongly right to left;
  // -2: Like -1 but also contains neutrals.
  //
  // (A neutral character has no inherent directionality; it is not a character
  // with zero (0) width. Spaces and punctuation are examples of neutral
  // characters. Non-neutral characters are those with inherent directionality.
  // For example, Roman letters (left-to-right) and Arabic letters (right-to-left)
  // have directionality. In a “normal” Roman font where spaces and punctuation
  // are present, the font direction hints should be set to two (2).)
  fontDirectionHint: number
  // 0 for short offsets (Offset16), 1 for long (Offset32).
  indexToLocFormat: number
  // 0 for current format.
  glyphDataFormat: number
}

interface HeadTableFlags {
  // Bit 0: Baseline for font at y=0.
  baselineAtY0: boolean
  // Bit 1: Left sidebearing point at x=0 (relevant only for TrueType rasterizers) — see the note below regarding variable fonts.
  leftSidebearingAtX0: boolean
  // Bit 2: Instructions may depend on point size.
  instructionsMayDependOnPointSize: boolean
  // Bit 3: Force ppem to integer values for all internal scaler math; may use fractional ppem sizes if this bit is clear. It is strongly recommended that this be set in hinted fonts.
  forcePpemToIntegers: boolean
  // Bit 4: Instructions may alter advance width (the advance widths might not scale linearly).
  instructionsMayAlterAdvanceWidth: boolean
  // Bit 5: This bit is not used in OpenType, and should not be set in order to ensure compatible behavior on all platforms. If set, it may result in different behavior for vertical layout in some platforms. (See Apple’s specification for details regarding behavior in Apple platforms.)
  // Bits 6–10: These bits are not used in Opentype and should always be cleared. (See Apple’s specification for details regarding legacy used in Apple platforms.)
  // Bit 11: Font data is “lossless” as a result of having been subjected to optimizing transformation and/or compression (such as e.g. compression mechanisms defined by ISO/IEC 14496-18, MicroType Express, WOFF 2.0 or similar) where the original font functionality and features are retained but the binary compatibility between input and output font files is not guaranteed. As a result of the applied transform, the DSIG table may also be invalidated.
  lossless: boolean
  // Bit 12: Font converted (produce compatible metrics).
  converted: boolean
  // Bit 13: Font optimized for ClearType™. Note, fonts that rely on embedded bitmaps (EBDT) for rendering should not be considered optimized for ClearType, and therefore should keep this bit cleared.
  clearTypeOptimized: boolean
  // Bit 14: Last Resort font. If set, indicates that the glyphs encoded in the 'cmap' subtables are simply generic symbolic representations of code point ranges and don’t truly represent support for those code points. If unset, indicates that the glyphs encoded in the 'cmap' subtables represent proper support for those code points.
  lastResortFont: boolean
  // Bit 15: Reserved, set to 0.
}

export function readHeadTable(view: Reader) {
  const majorVersion = view.u16()
  const minorVersion = view.u16()
  const fontRevision = view.u32()
  const checksumAdjustment = view.u32()
  const magicNumber = view.u32()
  const flags = parseFlags(view.u16())
  const unitsPerEm = view.u16()

  const created = view.date()
  const modified = view.date()

  const xMin = view.i16()
  const yMin = view.i16()
  const xMax = view.i16()
  const yMax = view.i16()

  const macStyle = view.u16()
  const lowestRecPPEM = view.u16()
  const fontDirectionHint = view.i16()
  const indexToLocFormat = view.i16()
  const glyphDataFormat = view.i16()

  const head: HeadTable = {
    majorVersion,
    minorVersion,
    fontRevision: toHex(fontRevision),
    checksumAdjustment,
    magicNumber: toHex(magicNumber),
    flags,
    unitsPerEm,
    created,
    modified,
    xMin,
    yMin,
    xMax,
    yMax,
    macStyle,
    lowestRecPPEM,
    fontDirectionHint,
    indexToLocFormat,
    glyphDataFormat,
  }

  return head
}

function parseFlags(flags: number) {
  const baselineAtY0 = Boolean(flags & 1)
  const leftSidebearingAtX0 = Boolean(flags & (1 << 1))
  const instructionsMayDependOnPointSize = Boolean(flags & (1 << 2))
  const forcePpemToIntegers = Boolean(flags & (1 << 3))
  const instructionsMayAlterAdvanceWidth = Boolean(flags & (1 << 4))
  const lossless = Boolean(flags & (1 << 11))
  const converted = Boolean(flags & (1 << 12))
  const clearTypeOptimized = Boolean(flags & (1 << 13))
  const lastResortFont = Boolean(flags & (1 << 14))

  return {
    baselineAtY0,
    leftSidebearingAtX0,
    instructionsMayDependOnPointSize,
    forcePpemToIntegers,
    instructionsMayAlterAdvanceWidth,
    lossless,
    converted,
    clearTypeOptimized,
    lastResortFont,
  }
}
