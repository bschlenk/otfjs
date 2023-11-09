import { Matrix } from './matrix.js'
import { Glyph } from './tables/glyf.js'

export function glyphToSvgPath(glyph: Glyph, capHeight: number) {
  const path = new PathBuilder(new Matrix(1, 0, 0, -1, 0, capHeight))

  let first = true
  let cStart = glyph.points[0]
  for (let i = 0; i < glyph.points.length; ++i) {
    const point = glyph.points[i]
    const isEnd = glyph.endPtsOfContours.includes(i)

    if (first) {
      // assuming the first point can't be off the curve but let's see
      if (!point.onCurve) throw new Error('first point is off the curve')
      path.moveTo(point)
      cStart = point
      first = false
      continue
    }

    if (point.onCurve) {
      path.lineTo(point)

      if (isEnd) {
        path.closePath()
        first = true
      }

      continue
    }

    const next = glyph.points[i + 1]
    let end = next

    if (isEnd) {
      // the last point
      end = cStart
      first = true
    } else if (next.onCurve) {
      end = next
      ++i
    } else {
      // implied by the midpoint
      end = {
        x: (point.x + next.x) / 2,
        y: (point.y + next.y) / 2,
        onCurve: true,
      }
    }

    path.quadraticCurveTo(point, end)
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

interface IPoint {
  x: number
  y: number
}
