import { PathBuilder } from './path-builder.js'
import { Glyph, Point } from './tables/glyf.js'

export function walkGlyphPath(glyph: Glyph, path: PathBuilder) {
  if (glyph.type === 'composite') {
    console.log(glyph)
    return
  }

  let i = 0
  for (const endIndex of glyph.endPtsOfContours) {
    let start = glyph.points[i++]

    if (!start.onCurve) {
      const last = glyph.points[endIndex]
      if (last.onCurve) {
        start = last
      } else {
        start = midpoint(start, last)
      }
      // walk i back so we handle the off curve point as we enter the loop
      --i
    }

    path.moveTo(start)

    while (i <= endIndex) {
      const point = glyph.points[i++]

      if (point.onCurve) {
        path.lineTo(point)
        continue
      }

      const next = glyph.points[i]
      let end = next

      if (i > endIndex) {
        // the last point
        end = start
      } else if (next.onCurve) {
        end = next
        ++i
      } else {
        end = midpoint(point, next)
      }

      path.quadraticCurveTo(point, end)
    }

    path.closePath()
  }
}

function midpoint(p1: Point, p2: Point) {
  // TODO: round this to the grid
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    onCurve: true,
  }
}
