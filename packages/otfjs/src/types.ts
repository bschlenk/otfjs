import type { Matrix } from '@bschlenk/mat'
import type { Vector } from '@bschlenk/vec'

import type { Extend } from './enums.js'
import type { GlyfCompositeFlags } from './tables/glyf.gen.js'

interface GlyfBase<T extends string> {
  type: T
  xMin: number
  yMin: number
  xMax: number
  yMax: number
  instructions: Uint8Array
}

export interface GlyfSimple extends GlyfBase<'simple'> {
  endPtsOfContours: number[]
  points: Point[]
  contoursOverlap: boolean
}

export interface GlyfComposite extends GlyfBase<'composite'> {
  components: GlyfComponent[]
}

export type Glyf = GlyfSimple | GlyfComposite

export interface GlyfComponent {
  flags: GlyfCompositeFlags
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

/**
 * A glyph as `getGlyph` returns it, independent of the table it came from.
 * For now that is always a glyf outline, with composites flattened.
 */
export interface Glyph extends GlyfSimple {
  id: number
  advanceWidth: number
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
