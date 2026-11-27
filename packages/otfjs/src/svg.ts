import * as mat from '@bschlenk/mat'
import * as vec from '@bschlenk/vec'

import { rgbaToCss } from './color.js'
import { Extend } from './enums.js'
import { getGlyph } from './fns/get-glyph.js'
import type { FontHandle } from './font-handle.js'
import { walkGlyphPath } from './glyph/glyph.path.js'
import { SvgPathBuilder } from './path-builder.js'
import {
  type ColorLayer,
  ColorRecordType,
  CompositeMode,
} from './tables/colr.js'
import { ColrTableReader } from './tables/colr.js'
import { CpalTableReader } from './tables/cpal.js'
import { HeadTableReader } from './tables/head.js'
import type { Glyph, GlyphOutline } from './types.js'

// The gradient coords of a color glyph are always relative to the em square
const gradientUnits = 'userSpaceOnUse'

// SVG paths of the glyphs COLR layers paint, per font. Color fonts reuse
// layer glyphs heavily: Noto Color Emoji paints 38k glyphs 130k times.
const layerPaths = new WeakMap<FontHandle, Map<number, string>>()

export function glyphToSvgPath(glyph: GlyphOutline) {
  const path = new SvgPathBuilder()
  walkGlyphPath(glyph, path)
  return path.toString()
}

export interface Node {
  type: string
  /**
   * SVG attributes, by their SVG names, like `stop-color`. `style` is an
   * object with camelCase CSS property names, like React's:
   * `{ mixBlendMode: 'screen' }`. Undefined values mean no attribute.
   */
  props: Record<string, any>
  children: Node[]
}

/**
 * Takes a glyph and returns an object describing all the paths and defs
 * required to render as an SVG. The returned paths array is in the order
 * required to render within an SVG element. The defs should be rendered
 * inside a `<defs>` element. Ids linking defs to paths are scoped using
 * the given glyph's id, so should not conflict with other glyphs on the
 * page as long as they are all from the same font.
 *
 * TODO: allow scoping ids?
 */
export function glyphToColorSvg(
  glyph: Glyph,
  font: FontHandle,
  paletteIdx: number,
): { paths: Node[]; defs: Node[] } {
  const colr = font.readTableOrNull(ColrTableReader)
  const tree = colr?.colorGlyph(glyph.id)
  const defs: Node[] = []

  if (!tree) {
    const d = glyphToSvgPath(glyph)
    return { paths: [node('path', { d })], defs }
  }

  // A paint with no glyph above it to clip it fills everything (up to the
  // COLR ClipBox, which isn't read yet). Approximate that with the glyph's
  // em box, or with its bbox when it has no advance, like a combining mark.
  const fillRect =
    glyph.advanceWidth ?
      {
        x: 0,
        y: 0,
        width: glyph.advanceWidth,
        height: font.readTable(HeadTableReader).unitsPerEm,
      }
    : {
        x: glyph.xMin,
        y: glyph.yMin,
        width: glyph.xMax - glyph.xMin,
        height: glyph.yMax - glyph.yMin,
      }

  // Masks default to the masked element's bounding box plus 10%, which can
  // cut off what they reveal. Make them cover far more than the glyph can.
  const upem = font.readTable(HeadTableReader).unitsPerEm
  const maskRegion = {
    maskUnits: 'userSpaceOnUse',
    x: -4 * upem,
    y: -4 * upem,
    width: 9 * upem,
    height: 9 * upem,
  }

  const palette = font.readTable(CpalTableReader).getPalette(paletteIdx)
  const stack: Node[] = [node('')]
  let latest = stack[0]
  let matrix: mat.Matrix | null = null

  const getColor = (paletteIndex: number, alpha: number) => {
    if (paletteIndex === 0xffff) return 'currentcolor'
    return rgbaToCss(palette[paletteIndex], alpha)
  }

  const push = (type = 'path', props = {}): Node => {
    const el = node(type, props)
    stack.push(el)
    latest = el
    return el
  }

  const popOnly = (): Node => {
    const el = stack.pop()!
    latest = stack[stack.length - 1]

    if (el.type === 'path' && !el.props.d) {
      el.type = 'rect'
      Object.assign(el.props, fillRect)
    }

    return el
  }

  const pop = () => {
    const el = popOnly()
    latest.children.push(el)
  }

  // A fill paints the glyph shape it's in. With no shape (at the top level,
  // or directly in a composite), it fills everything: a path with no `d`
  // becomes the fill rect when popped.
  const setFill = (fill: string) => {
    if (latest.type === 'path') {
      latest.props.fill = fill
    } else {
      push('path', { fill })
      pop()
    }
  }

  const walk = (layer: ColorLayer) => {
    switch (layer.format) {
      case ColorRecordType.SOLID: {
        const { paletteIndex, alpha } = layer.props
        setFill(getColor(paletteIndex, alpha))
        break
      }

      case ColorRecordType.LINEAR_GRADIENT: {
        const { p0, p1, p2, extend, stops } = layer.props
        const spreadMethod = extendToSpreadMethod(extend)

        const stopsEls: Node[] = stops.map((stop) =>
          node('stop', {
            offset: stop.stopOffset,
            'stop-color': getColor(stop.paletteIndex, stop.alpha),
          }),
        )

        const id = `${glyph.id}-gradient-${defs.length}`

        const p3 = vec.add(
          p0,
          vec.projectOnto(
            vec.subtract(p1, p0),
            vec.rotate90(vec.subtract(p2, p0)),
          ),
        )

        defs.push(
          node(
            'linearGradient',
            {
              id,
              x1: p0.x,
              y1: p0.y,
              x2: p3.x,
              y2: p3.y,
              gradientTransform: matrix ? mat.toSvg(matrix) : undefined,
              spreadMethod,
              gradientUnits,
            },
            stopsEls,
          ),
        )

        setFill(`url('#${id}')`)
        break
      }

      case ColorRecordType.RADIAL_GRADIENT: {
        const { p0, p1, r0, r1, extend, stops } = layer.props
        const spreadMethod = extendToSpreadMethod(extend)

        const stopsEls = stops.map((stop) =>
          node('stop', {
            offset: stop.stopOffset,
            'stop-color': getColor(stop.paletteIndex, stop.alpha),
          }),
        )

        const id = `${glyph.id}-radial-gradient-${defs.length}`

        defs.push(
          node(
            'radialGradient',
            {
              id,
              fx: p0.x,
              fy: p0.y,
              fr: r0,
              cx: p1.x,
              cy: p1.y,
              r: r1,
              gradientTransform: matrix ? mat.toSvg(matrix) : undefined,
              spreadMethod,
              gradientUnits,
            },
            stopsEls,
          ),
        )

        setFill(`url('#${id}')`)
        break
      }

      case ColorRecordType.GLYPH: {
        const { glyphId } = layer.props
        const d = layerGlyphPath(font, glyphId)

        // The glyph's paint is in the transformed space, so the group takes
        // the pending transform and the paint starts without one.
        const saved = matrix
        matrix = null
        const transform = saved ? mat.toSvg(saved) : undefined

        if (layer.children.every(isFill)) {
          // The common case: the glyph filled with a color or gradient.
          if (transform) push('g', { transform })
          push('path', { d })
          walkAll(layer.children)
          pop()
          if (transform) pop()
        } else {
          // Anything else, like more glyphs, is clipped to this glyph.
          const id = `${glyph.id}-clip-${defs.length}`
          defs.push(node('clipPath', { id }, [node('path', { d })]))
          push('g', { transform, 'clip-path': `url(#${id})` })
          walkAll(layer.children)
          pop()
        }

        matrix = saved
        break
      }

      case ColorRecordType.TRANSFORM: {
        // Transforms apply to the whole subtree, including siblings within
        // it, and nest by multiplying: the outer one applies last.
        const saved = matrix
        matrix =
          matrix ? mat.mult(matrix, layer.props.matrix) : layer.props.matrix
        walkAll(layer.children)
        matrix = saved
        break
      }

      case ColorRecordType.COMPOSITE: {
        const { mode, src, dest } = layer.props

        if (mode === CompositeMode.CLEAR) break

        if (mode === CompositeMode.SRC_IN || mode === CompositeMode.DEST_IN) {
          // One side drawn only where the other has coverage, scaled by its
          // alpha: an alpha mask made of the other side.
          const [shown, mask] =
            mode === CompositeMode.SRC_IN ? [src, dest] : [dest, src]
          const saved = matrix
          matrix = null

          const id = `${glyph.id}-mask-${defs.length}`
          push('mask', { id, style: { maskType: 'alpha' }, ...maskRegion })
          walkAll(mask)
          defs.push(popOnly())

          push('g', {
            transform: saved ? mat.toSvg(saved) : undefined,
            mask: `url(#${id})`,
          })
          walkAll(shown)
          pop()

          matrix = saved
          break
        }

        // Draw the backdrop, then the source over it, both in an isolated
        // group so the source only blends with this backdrop. Nested
        // composites are just nested groups.
        const saved = matrix
        matrix = null
        push('g', {
          transform: saved ? mat.toSvg(saved) : undefined,
          style: { isolation: 'isolate' },
        })

        const blend = BLEND_MODES[mode]
        const drawDest = () => {
          push('g')
          walkAll(dest)
          pop()
        }
        const drawSrc = () => {
          push('g', blend ? { style: { mixBlendMode: blend } } : {})
          walkAll(src)
          pop()
        }

        if (mode === CompositeMode.SRC) {
          drawSrc()
        } else if (mode === CompositeMode.DEST) {
          drawDest()
        } else if (mode === CompositeMode.DEST_OVER) {
          drawSrc()
          drawDest()
        } else if (mode === CompositeMode.SRC_OVER || blend) {
          drawDest()
          drawSrc()
        } else {
          // SRC_OUT, DEST_OUT, SRC_ATOP, DEST_ATOP and XOR. No local font
          // uses them yet.
          throw new Error(`TODO: unsupported COLR composite mode ${mode}`)
        }

        pop()
        matrix = saved
        break
      }
    }
  }

  const walkAll = (tree: ColorLayer[]) => {
    for (const layer of tree) {
      walk(layer)
    }
  }

  walkAll(tree)

  return { paths: stack[0].children, defs }
}

/** Whether a glyph's child paint layer is just a color or gradient fill. */
function isFill(layer: ColorLayer): boolean {
  switch (layer.format) {
    case ColorRecordType.SOLID:
    case ColorRecordType.LINEAR_GRADIENT:
    case ColorRecordType.RADIAL_GRADIENT:
      return true
    case ColorRecordType.TRANSFORM:
      // A transformed gradient becomes its gradientTransform.
      return layer.children.every(isFill)
    default:
      return false
  }
}

/**
 * CSS `mix-blend-mode` values for the COLR composite modes that blend
 * colors. They line up one to one with the W3C Compositing spec, which COLR
 * defines them by. The rest, CLEAR through XOR, are Porter-Duff operators
 * that only decide which shape covers which, and have no `mix-blend-mode`
 * equivalent; they're handled in the COMPOSITE case.
 */
const BLEND_MODES: Partial<Record<CompositeMode, string>> = {
  [CompositeMode.PLUS]: 'plus-lighter',
  [CompositeMode.SCREEN]: 'screen',
  [CompositeMode.OVERLAY]: 'overlay',
  [CompositeMode.DARKEN]: 'darken',
  [CompositeMode.LIGHTEN]: 'lighten',
  [CompositeMode.COLOR_DODGE]: 'color-dodge',
  [CompositeMode.COLOR_BURN]: 'color-burn',
  [CompositeMode.HARD_LIGHT]: 'hard-light',
  [CompositeMode.SOFT_LIGHT]: 'soft-light',
  [CompositeMode.DIFFERENCE]: 'difference',
  [CompositeMode.EXCLUSION]: 'exclusion',
  [CompositeMode.MULTIPLY]: 'multiply',
  [CompositeMode.HSL_HUE]: 'hue',
  [CompositeMode.HSL_SATURATION]: 'saturation',
  [CompositeMode.HSL_COLOR]: 'color',
  [CompositeMode.HSL_LUMINOSITY]: 'luminosity',
}

function layerGlyphPath(font: FontHandle, glyphId: number) {
  let paths = layerPaths.get(font)
  if (!paths) layerPaths.set(font, (paths = new Map<number, string>()))

  let d = paths.get(glyphId)
  if (d === undefined) {
    d = glyphToSvgPath(getGlyph(font, glyphId))
    paths.set(glyphId, d)
  }

  return d
}

function node(
  type: string,
  props: Record<string, any> = {},
  children: Node[] = [],
): Node {
  return { type, props, children }
}

function extendToSpreadMethod(extend: Extend) {
  switch (extend) {
    case Extend.PAD:
      return 'pad'
    case Extend.REFLECT:
      return 'reflect'
    case Extend.REPEAT:
      return 'repeat'
  }
}
