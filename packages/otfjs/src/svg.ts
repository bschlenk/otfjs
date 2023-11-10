import { Matrix } from './matrix.js'
import { Glyph, Point } from './tables/glyf.js'

export function glyphToSvgPath(glyph: Glyph, capHeight: number) {
  const path = new PathBuilder(new Matrix(1, 0, 0, -1, 0, capHeight))

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

  return path.toString()
}

class PathBuilder {
  private d = ''

  constructor(private readonly matrix: Matrix | null = null) {}

  public moveTo(p: IPoint) {
    if (this.matrix) p = this.matrix.transformPoint(p)
    this.d += 'M' + join(p.x, p.y)
  }

  public lineTo(p: IPoint) {
    if (this.matrix) p = this.matrix.transformPoint(p)
    this.d += 'L' + join(p.x, p.y)
  }

  public quadraticCurveTo(p1: IPoint, p2: IPoint) {
    if (this.matrix) {
      p1 = this.matrix.transformPoint(p1)
      p2 = this.matrix.transformPoint(p2)
    }
    this.d += 'Q' + join(p1.x, p1.y, p2.x, p2.y)
  }

  public closePath() {
    this.d += 'Z'
  }

  public toString() {
    return this.d
  }
}

function join(...nums: number[]) {
  let n = '' + nums[0]
  for (let i = 1; i < nums.length; ++i) {
    // paths don't need a separator for negative numbers
    if (nums[i] >= 0) n += ' '
    n += nums[i]
  }
  return n
}

function midpoint(p1: Point, p2: Point) {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
    onCurve: true,
  }
}

interface IPoint {
  x: number
  y: number
}
