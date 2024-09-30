import { Reader } from '../buffer/reader.js'
import { createFlagReader } from '../flags.js'
import { assert } from '../utils/utils.js'

enum GposLookupType {
  Single = 1,
  Pair = 2,
  Cursive = 3,
  MarkToBase = 4,
  MarkToLigature = 5,
  MarkToMark = 6,
  Context = 7,
  ChainedContext = 8,
  Extension = 9,
}

export interface GposTable {
  version: number
  scriptList: any[]
  featureList: any[]
  lookupList: any[]
  featureVariationsOffset: number | null
}

export function readGposTable(view: Reader): GposTable {
  const version = view.u32()
  const scriptListOffset = view.u16()
  const featureListOffset = view.u16()
  const lookupListOffset = view.u16()

  let featureVariationsOffset = null
  if (version === 0x00010001) {
    featureVariationsOffset = view.u32()
  }

  const scriptList = readScriptListTable(view.subtable(scriptListOffset))
  const featureList = readFeatureListTable(view.subtable(featureListOffset))
  const lookupList = readLookupListTable(view.subtable(lookupListOffset))

  return {
    version,
    scriptList,
    featureList,
    lookupList,
    featureVariationsOffset,
  }
}

// Script List

function readScriptListTable(view: Reader) {
  const scriptCount = view.u16()
  return view.array(scriptCount, () => {
    const scriptTag = view.tag()
    const scriptOffset = view.u16()
    const scripts = readScriptTable(view.subtable(scriptOffset))
    return { scriptTag, scripts }
  })
}

function readScriptTable(view: Reader) {
  const defaultLangSysOffset = view.u16()
  const langSysCount = view.u16()

  const defaultLangSys =
    defaultLangSysOffset === 0 ? null : (
      readLangSysTable(view.subtable(defaultLangSysOffset))
    )

  const langSysRecords = view.array(langSysCount, () => {
    const langSysTag = view.tag()
    const langSysOffset = view.u16()
    const langSys = readLangSysTable(view.subtable(langSysOffset))
    return { langSysTag, langSys }
  })

  return { defaultLangSys, langSysRecords }
}

function readLangSysTable(view: Reader) {
  const lookupOrderOffset = view.u16()
  const reqFeatureIndex = view.u16()
  const featureIndexCount = view.u16()
  const featureIndices = view.array(featureIndexCount, () => view.u16())

  return { lookupOrderOffset, reqFeatureIndex, featureIndices }
}

// Feature List

function readFeatureListTable(view: Reader) {
  const featureCount = view.u16()
  return view.array(featureCount, () => {
    const featureTag = view.tag()
    const featureOffset = view.u16()
    const feature = readFeatureTable(view.subtable(featureOffset))
    return { featureTag, feature }
  })
}

function readFeatureTable(view: Reader) {
  const featureParamsOffset = view.u16()
  const lookupIndexCount = view.u16()
  const lookupListIndices = view.array(lookupIndexCount, () => view.u16())

  return { featureParamsOffset, lookupListIndices }
}

// Lookup list

function readLookupListTable(view: Reader) {
  const lookupCount = view.u16()
  return view.array(lookupCount, () => {
    const lookupOffset = view.u16()
    return readLookupTable(view.subtable(lookupOffset))
  })
}

const lookupFlagReader = createFlagReader({
  rightToLeft: 0,
  ignoreBaseGlyphs: 1,
  ignoreLigatures: 2,
  ignoreMarks: 3,
  useMarkFilteringSet: 4,
  markAttachmentTypeMask: (flag: number) => (flag >> 8) & 0xff,
})

function readLookupTable(view: Reader) {
  const lookupType: GposLookupType = view.u16()
  const lookupFlag = lookupFlagReader(view.u16())
  const subTableCount = view.u16()
  const subTableOffsets = view.array(subTableCount, () => view.u16())

  let markFilteringSet = null
  if (lookupFlag.useMarkFilteringSet) {
    markFilteringSet = view.u16()
  }

  const subTables = subTableOffsets.map((offset) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    readLookupSubtable(view.subtable(offset), lookupType),
  )

  return {
    lookupType,
    lookupTypeStr: GposLookupType[lookupType],
    lookupFlag,
    subTables,
    markFilteringSet,
  }
}

function readLookupSubtable(view: Reader, lookupType: GposLookupType) {
  switch (lookupType) {
    case GposLookupType.Single:
      return readSingleSubtable(view)
    case GposLookupType.Pair:
      return readPairSubtable(view)
    case GposLookupType.Cursive:
      // return readCursiveSubtable(view)
      return null
    case GposLookupType.MarkToBase:
      // return readMarkToBaseSubtable(view)
      return null
    case GposLookupType.MarkToLigature:
      // return readMarkToLigatureSubtable(view)
      return null
    case GposLookupType.MarkToMark:
      // return readMarkToMarkSubtable(view)
      return null
    case GposLookupType.Context:
      // return readContextSubtable(view)
      return null
    case GposLookupType.ChainedContext:
      // return readChainedContextSubtable(view)
      return null
    case GposLookupType.Extension:
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return readExtensionSubtable(view)
  }
}

function readSingleSubtable(view: Reader) {
  const posFormat = view.u16()
  /*
  const coverageOffset = view.u16()
  const valueFormat = view.u16()
  const value = readValueRecord(view, valueFormat)
  return { coverageOffset, valueFormat, value }
  */
  return { posFormat }
}

const valueFormatReader = createFlagReader({
  xPlacement: 0,
  yPlacement: 1,
  xAdvance: 2,
  yAdvance: 3,
  xPlaDeviceOffset: 4,
  yPlaDeviceOffset: 5,
  xAdvDeviceOffset: 6,
  yAdvDeviceOffset: 7,
})

type ValueFormat = ReturnType<typeof valueFormatReader>

function readPairSubtable(view: Reader) {
  const posFormat = view.u16()
  const coverageOffset = view.u16()
  const valueFormat1 = valueFormatReader(view.u16())
  const valueFormat2 = valueFormatReader(view.u16())
  const coverage = readCoverageTable(view.subtable(coverageOffset))

  switch (posFormat) {
    case 1: {
      const pairSetCount = view.u16()
      const pairSetOffsets = view.array(pairSetCount, () => view.u16())
      const pairSets = pairSetOffsets.map((offset) =>
        readPairSetTable(view.subtable(offset), valueFormat1, valueFormat2),
      )

      return { posFormat, coverage, pairSets }
    }

    case 2: {
      const classDef1Offset = view.u16()
      const classDef2Offset = view.u16()
      const class1Count = view.u16()
      const class2Count = view.u16()
      const classRecords = view.array(class1Count, () =>
        view.array(class2Count, () => {
          const value1 = readValueRecord(view, valueFormat1)
          const value2 = readValueRecord(view, valueFormat2)
          return { value1, value2 }
        }),
      )

      const classDef1Table = readClassDefTable(view.subtable(classDef1Offset))
      const classDef2Table = readClassDefTable(view.subtable(classDef2Offset))

      return {
        posFormat,
        coverage,
        classRecords,
        classDef1Table,
        classDef2Table,
      }
    }

    default:
      assert(false, `unsupported pair format ${posFormat}`)
  }
}

function readExtensionSubtable(view: Reader): any {
  const posFormat = view.u16()
  assert(posFormat === 1, `unsupported extension format ${posFormat}`)

  const lookupType = view.u16()
  const offset = view.u32()
  return readLookupSubtable(view.subtable(offset), lookupType)
}

function readCoverageTable(view: Reader) {
  const coverageFormat = view.u16()

  switch (coverageFormat) {
    case 1: {
      const glyphCount = view.u16()
      const glyphArray = view.array(glyphCount, () => view.u16())
      return { coverageFormat, glyphArray }
    }

    case 2: {
      const rangeCount = view.u16()
      const rangeRecords = view.array(rangeCount, () => {
        const startGlyphId = view.u16()
        const endGlyphId = view.u16()
        const startCoverageIndex = view.u16()
        return { startGlyphId, endGlyphId, startCoverageIndex }
      })
      return { coverageFormat, rangeRecords }
    }

    default:
      assert(false, `unsupported coverage format ${coverageFormat}`)
  }
}

function readPairSetTable(
  view: Reader,
  valueFormat1: ValueFormat,
  valueFormat2: ValueFormat,
) {
  const pairValueCount = view.u16()
  const pairValues = view.array(pairValueCount, () => {
    const secondGlyph = view.u16()
    const value1 = readValueRecord(view, valueFormat1)
    const value2 = readValueRecord(view, valueFormat2)
    return { secondGlyph, value1, value2 }
  })

  return { pairValues }
}

interface ValueRecord {
  /** Horizontal adjustment for placement, in design units. */
  xPlacement?: number
  /** Vertical adjustment for placement, in design units. */
  yPlacement?: number
  /** Horizontal adjustment for advance, in design units — only used for horizontal layout. */
  xAdvance?: number
  /** Vertical adjustment for advance, in design units — only used for vertical layout. */
  yAdvance?: number
  /**
   * Offset to Device table (non-variable font) / VariationIndex table
   * (variable font) for horizontal placement, from beginning of the immediate
   * parent table (SinglePos or PairPosFormat2 lookup subtable, PairSet table
   * within a PairPosFormat1 lookup subtable) — may be NULL.
   */
  xPlaDeviceOffset?: number
  /**
   * Offset to Device table (non-variable font) / VariationIndex table
   * (variable font) for vertical placement, from beginning of the immediate
   * parent table (SinglePos or PairPosFormat2 lookup subtable, PairSet table
   * within a PairPosFormat1 lookup subtable) — may be NULL.
   */
  yPlaDeviceOffset?: number
  /**
   * Offset to Device table (non-variable font) / VariationIndex table
   * (variable font) for horizontal advance, from beginning of the immediate
   * parent table (SinglePos or PairPosFormat2 lookup subtable, PairSet table
   * within a PairPosFormat1 lookup subtable) — may be NULL.
   */
  xAdvDeviceOffset?: number
  /**
   * Offset to Device table (non-variable font) / VariationIndex table
   * (variable font) for vertical advance, from beginning of the immediate
   * parent table (SinglePos or PairPosFormat2 lookup subtable, PairSet table
   * within a PairPosFormat1 lookup subtable) — may be NULL.
   */
  yAdvDeviceOffset?: number
}

function readValueRecord(view: Reader, valueFormat: ValueFormat) {
  const rec: ValueRecord = {}

  if (valueFormat.value === 0) return rec

  if (valueFormat.xPlacement) {
    rec.xPlacement = view.i16()
  }

  if (valueFormat.yPlacement) {
    rec.yPlacement = view.i16()
  }

  if (valueFormat.xAdvance) {
    rec.xAdvance = view.i16()
  }

  if (valueFormat.yAdvance) {
    rec.yAdvance = view.i16()
  }

  if (valueFormat.xPlaDeviceOffset) {
    rec.xPlaDeviceOffset = view.u16()
  }

  if (valueFormat.yPlaDeviceOffset) {
    rec.yPlaDeviceOffset = view.u16()
  }

  if (valueFormat.xAdvDeviceOffset) {
    rec.xAdvDeviceOffset = view.u16()
  }

  if (valueFormat.yAdvDeviceOffset) {
    rec.yAdvDeviceOffset = view.u16()
  }

  return rec
}

function readClassDefTable(view: Reader) {
  const classFormat = view.u16()

  switch (classFormat) {
    case 1: {
      const startGlyphId = view.u16()
      const glyphCount = view.u16()
      const classValues = view.array(glyphCount, () => view.u16())
      return { classFormat, startGlyphId, classValues }
    }

    case 2: {
      const rangeCount = view.u16()
      const rangeRecords = view.array(rangeCount, () => {
        const startGlyphId = view.u16()
        const endGlyphId = view.u16()
        const classValue = view.u16()
        return { startGlyphId, endGlyphId, classValue }
      })
      return { classFormat, rangeRecords }
    }

    default:
      assert(false, `unsupported class format ${classFormat}`)
  }
}
