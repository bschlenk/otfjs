import type { Matrix } from '@bschlenk/mat'
import type { Vector } from '@bschlenk/vec'

import type { Extend } from './enums.js'
import type { GlyfCompositeFlags } from './tables/glyf.gen.js'

export interface GlyphBounds {
  xMin: number
  yMin: number
  xMax: number
  yMax: number
}

interface GlyfBase<T extends string> extends GlyphBounds {
  type: T
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

/** One step of a glyph outline, named like the `PathBuilder` methods. */
export type PathCommand =
  | { type: 'moveTo'; x: number; y: number }
  | { type: 'lineTo'; x: number; y: number }
  | { type: 'quadraticCurveTo'; x1: number; y1: number; x: number; y: number }
  | {
      type: 'cubicCurveTo'
      x1: number
      y1: number
      x2: number
      y2: number
      x: number
      y: number
    }
  | { type: 'closePath' }

/**
 * A glyph outline from the CFF table, found by running its charstring.
 * The bounds are the outline's tight bounds, since CFF doesn't store any.
 */
export interface CffOutline extends GlyphBounds {
  type: 'cff'
  commands: PathCommand[]
}

/** Any glyph outline that can be drawn. */
export type GlyphOutline = GlyfSimple | CffOutline

interface GlyphMetrics {
  id: number
  advanceWidth: number
}

/** A glyph from the glyf table, with composites flattened. */
export interface GlyfGlyph extends GlyfSimple, GlyphMetrics {}

/** A glyph from the CFF table. */
export interface CffGlyph extends CffOutline, GlyphMetrics {}

/**
 * A glyph as `getGlyph` returns it, independent of the table it came
 * from. Check `type` to tell them apart: `'simple'` for glyf outlines,
 * which have TrueType points and instructions, and `'cff'` for CFF ones.
 */
export type Glyph = GlyfGlyph | CffGlyph

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
