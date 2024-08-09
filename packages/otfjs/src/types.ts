import type { Matrix } from '@bschlenk/mat'
import type { Vector } from '@bschlenk/vec'

import type { Extend } from './enums.js'
import { GlyphCompositeFlags } from './glyph-utils.js'

interface GlyphBase<T extends string> {
  type: T
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  instructions: Uint8Array
}

export interface GlyphSimple extends GlyphBase<'simple'> {
  endPtsOfContours: number[]
  points: Point[]
  contoursOverlap: boolean
}

export interface GlyphComposite extends GlyphBase<'composite'> {
  components: GlyphCompositeComponent[]
}

export type Glyph = GlyphSimple | GlyphComposite

export interface GlyphCompositeComponent {
  flags: GlyphCompositeFlags
  glyphIndex: number
  arg1: number
  arg2: number
  extra: number[]
}

export interface Point {
  x: number
  y: number
  onCurve: boolean
}

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface ColorVisitor {
  paintSolid(paletteIndex: number, alpha: number): void
  paintLinearGradient(
    p0: Vector,
    p1: Vector,
    p2: Vector,
    extend: Extend,
    stops: { stopOffset: number; paletteIndex: number; alpha: number }[],
  ): void
  paintGlyph(glyphId: number): void
  enterTransform(matrix: Matrix): void
  exitTransform(): void
}
