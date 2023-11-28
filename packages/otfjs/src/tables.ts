/* eslint-disable @typescript-eslint/no-unused-vars */

const REQUIRED_TABLES = [
  'cmap', // Character to glyph mapping
  'head', // Font header
  'hhea', // Horizontal header
  'hmtx', // Horizontal metrics
  'maxp', // Maximum profile
  'name', // Naming table
  'OS/2', // OS/2 and Windows specific metrics
  'post', // PostScript information
]

const TRUE_TYPE_OUTLINE_TABLES = [
  'cvt ', // Control Value Table (optional table)
  'fpgm', // Font program (optional table)
  'glyf', // Glyph data
  'loca', // Index to location
  'prep', // CVT Program (optional table)
  'gasp', // Grid-fitting/Scan-conversion (optional table)
]

const CCF_OUTLINE_TABLES = [
  'CFF ', // Compact Font Format 1.0
  'CFF2', // Compact Font Format 2.0
  'VORG', // Vertical Origin (optional table)
]

const SVG_OUTLINE_TABLES = [
  'SVG ', // The SVG (Scalable Vector Graphics) table
]

const BITMAP_GLYPH_TABLES = [
  'EBDT', // Embedded bitmap data
  'EBLC', // Embedded bitmap location data
  'EBSC', // Embedded bitmap scaling data
  'CBDT', // Color bitmap data
  'CBLC', // Color bitmap location data
  'sbix', // Standard bitmap graphics
]

const ADVANCED_TABLES = [
  'BASE', // Baseline data
  'GDEF', // Glyph definition data
  'GPOS', // Glyph positioning data
  'GSUB', // Glyph substitution data
  'JSTF', // Justification data
  'MATH', // Math layout data
]

const OTF_VARIATION_TABLES = [
  'avar', // Axis variations
  'cvar', // CVT variations (TrueType outlines only)
  'fvar', // Font variations
  'gvar', // Glyph variations (TrueType outlines only)
  'HVAR', // Horizontal metrics variations
  'MVAR', // Metrics variations
  'STAT', // Style attributes (required for variable fonts, optional for non-variable fonts)
  'VVAR', // Vertical metrics variations
]

const COLOR_FONTS_TABLES = [
  'COLR', // Color table
  'CPAL', // Color palette table
  'CBDT', // Color bitmap data
  'CBLC', // Color bitmap location data
  'sbix', // Standard bitmap graphics
  'SVG ', // The SVG (Scalable Vector Graphics) table
]

const OTHER_TABLES = [
  'DSIG', // Digital signature
  'hdmx', // Horizontal device metrics
  'kern', // Kerning
  'LTSH', // Linear threshold data
  'MERG', // Merge
  'meta', // Metadata
  'STAT', // Style attributes
  'PCLT', // PCL 5 data
  'VDMX', // Vertical device metrics
  'vhea', // Vertical Metrics header
  'vmtx', // Vertical Metrics
]
