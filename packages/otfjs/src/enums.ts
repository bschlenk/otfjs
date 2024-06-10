/**
 * @see https://learn.microsoft.com/en-us/typography/opentype/spec/otff#table-directory
 * @see https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6.html#ScalerTypeNote
 */
export const enum SfntVersion {
  TRUE_TYPE = 0x00010000,
  OPEN_TYPE = 0x4f54544f, // "OTTO"
  APPLE_TRUE_TYPE = 0x74727565, // "true"
  POST_SCRIPT = 0x74797031, // "typ1"
}

export enum PlatformId {
  Unicode = 0,
  Macintosh = 1,
  ISO = 2,
  Windows = 3,
  Custom = 4,
}

export enum NameId {
  CopyrightNotice = 0,
  FontFamilyName = 1,
  FontSubfamilyName = 2,
  UniqueFontIdentifier = 3,
  FullFontName = 4,
  VersionString = 5,
  PostScriptName = 6,
  Trademark = 7,
  Manufacturer = 8,
  Designer = 9,
  Description = 10,
  VendorUrl = 11,
  DesignerUrl = 12,
  LicenseDescription = 13,
  LicenseUrl = 14,
  TypographicFamilyName = 16,
  TypographicSubfamilyName = 17,
  CompatibleFull = 18,
  SampleText = 19,
  PostScriptCidFindfontName = 20,
  WwsFamilyName = 21,
  WwsSubfamilyName = 22,
  LightBackgroundPalette = 23,
  DarkBackgroundPalette = 24,
  VariationsPostScriptNamePrefix = 25,
}

export enum Extend {
  /**	Use nearest color stop */
  PAD = 0,
  /**	Repeat from farthest color stop */
  REPEAT = 1,
  /**	Mirror color line from nearest end */
  REFLECT = 2,
}
