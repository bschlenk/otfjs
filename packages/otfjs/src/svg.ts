import * as mat from '@bschlenk/mat'
import * as vec from '@bschlenk/vec'

import { rgbaToCss } from './color.js'
import { Extend } from './enums.js'
import type { Font, GlyphEnriched } from './font.js'
import { walkGlyphPath } from './glyph-utils.js'
import { SvgPathBuilder } from './path-builder.js'
import {
  type ColorLayer,
  ColorRecordType,
  CompositeMode,
} from './tables/colr.js'
import { Glyph } from './tables/glyf.js'

export function glyphToSvgPath(glyph: Glyph) {
  const path = new SvgPathBuilder()
  walkGlyphPath(glyph, path)
  return path.toString()
}

export interface Node {
  type: string
  props: Record<string, any>
  children: Node[]
}

export function glyphToColorSvg(
  glyph: GlyphEnriched,
  font: Font,
  paletteIdx: number,
): { paths: Node[]; defs: Node[] } {
  const colr = font.getTableOrNull('COLR')
  const tree = colr?.colorGlyph(glyph.id)

  const width = glyph.advanceWidth
  const height = font.unitsPerEm

  const defs: Node[] = []

  if (!tree) {
    return {
      paths: [
        { type: 'path', props: { d: glyphToSvgPath(glyph) }, children: [] },
      ],
      defs,
    }
  }

  const palette = font.getTable('CPAL').getPalette(paletteIdx)
  const stack: Node[] = [{ type: '', props: {}, children: [] }]
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
      // make this a full size rect
      el.type = 'rect'
      Object.assign(el.props, { x: 0, y: 0, width, height })
    }

    return el
  }

  const pop = () => {
    const el = popOnly()
    latest.children.push(el)
  }

  const walk = (layer: ColorLayer) => {
    switch (layer.format) {
      case ColorRecordType.SOLID: {
        const { paletteIndex, alpha } = layer.props
        latest.props.fill = getColor(paletteIndex, alpha)
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
              gradientUnits: 'userSpaceOnUse',
            },
            stopsEls,
          ),
        )

        matrix = null
        latest.props.fill = `url('#${id}')`
        break
      }

      case ColorRecordType.RADIAL_GRADIENT: {
        const { p0, p1, r0, r1, extend, stops } = layer.props
        const spreadMethod = extendToSpreadMethod(extend)

        const stopsEls: Node[] = stops.map((stop) =>
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
              gradientUnits: 'userSpaceOnUse',
            },
            stopsEls,
          ),
        )

        matrix = null
        latest.props.fill = `url('#${id}')`
        break
      }

      case ColorRecordType.GLYPH: {
        const { glyphId } = layer.props
        const g = font.getGlyph(glyphId)
        const d = glyphToSvgPath(g)
        let hasMatrix = false

        if (matrix) {
          push('g', { transform: mat.toSvg(matrix) })
          hasMatrix = true
          matrix = null
        }

        push('path', { d })
        walkAll(layer.children)
        pop()

        if (hasMatrix) pop()

        break
      }

      case ColorRecordType.TRANSFORM: {
        matrix = layer.props.matrix
        walkAll(layer.children)
        break
      }

      case ColorRecordType.COMPOSITE: {
        const { mode, src, dest } = layer.props

        switch (mode) {
          case CompositeMode.SRC_IN: {
            push()
            walkAll(dest)
            const destId = `${glyph.id}-${defs.length}`
            latest.props.id = destId
            const destEl = popOnly()

            defs.push(destEl)
            const id = `${glyph.id}-${defs.length}`
            defs.push(
              node('filter', { id }, [
                node('feImage', { href: `#${destId}`, x: '0', y: '0' }),
                node('feComposite', { in: 'SourceGraphic', operator: 'in' }),
              ]),
            )

            const el = push()
            el.type = 'g'
            el.props.style = { filter: `url(#${id})` }
            walkAll(src)
            pop()
            break
          }

          case CompositeMode.SOFT_LIGHT: {
            break
          }

          default:
            break
        }
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
