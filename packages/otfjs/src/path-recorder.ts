import type { Vector } from '@bschlenk/vec'

import type { PathBuilder } from './path-builder.js'
import type { GlyphBounds, PathCommand } from './types.js'

/**
 * A path builder that keeps the commands it's given, and the tight bounds
 * of the outline they draw: curves count only as far as they reach, not
 * out to their control points.
 */
export class PathRecorder implements PathBuilder {
  readonly commands: PathCommand[] = []

  private xMin = Infinity
  private yMin = Infinity
  private xMax = -Infinity
  private yMax = -Infinity
  private current: Vector = { x: 0, y: 0 }

  moveTo(p: Vector) {
    this.commands.push({ type: 'moveTo', x: p.x, y: p.y })
    this.extend(p.x, p.y)
    this.current = p
  }

  lineTo(p: Vector) {
    this.commands.push({ type: 'lineTo', x: p.x, y: p.y })
    this.extend(p.x, p.y)
    this.current = p
  }

  quadraticCurveTo(p1: Vector, p2: Vector) {
    this.commands.push({
      type: 'quadraticCurveTo',
      x1: p1.x,
      y1: p1.y,
      x: p2.x,
      y: p2.y,
    })

    const p0 = this.current
    this.extend(p2.x, p2.y)
    const tx = quadraticExtremum(p0.x, p1.x, p2.x)
    if (tx !== null) this.extend(quadratic(p0.x, p1.x, p2.x, tx), NaN)
    const ty = quadraticExtremum(p0.y, p1.y, p2.y)
    if (ty !== null) this.extend(NaN, quadratic(p0.y, p1.y, p2.y, ty))
    this.current = p2
  }

  cubicCurveTo(p1: Vector, p2: Vector, p3: Vector) {
    this.commands.push({
      type: 'cubicCurveTo',
      x1: p1.x,
      y1: p1.y,
      x2: p2.x,
      y2: p2.y,
      x: p3.x,
      y: p3.y,
    })

    const p0 = this.current
    this.extend(p3.x, p3.y)
    for (const t of cubicExtrema(p0.x, p1.x, p2.x, p3.x)) {
      this.extend(cubic(p0.x, p1.x, p2.x, p3.x, t), NaN)
    }
    for (const t of cubicExtrema(p0.y, p1.y, p2.y, p3.y)) {
      this.extend(NaN, cubic(p0.y, p1.y, p2.y, p3.y, t))
    }
    this.current = p3
  }

  closePath() {
    this.commands.push({ type: 'closePath' })
  }

  /** The outline's bounds, or all zeros if nothing was drawn. */
  bounds(): GlyphBounds {
    if (this.xMin > this.xMax) return { xMin: 0, yMin: 0, xMax: 0, yMax: 0 }
    return {
      xMin: this.xMin,
      yMin: this.yMin,
      xMax: this.xMax,
      yMax: this.yMax,
    }
  }

  /** Grow the bounds to include x and y. NaN leaves that axis alone. */
  private extend(x: number, y: number) {
    if (x < this.xMin) this.xMin = x
    if (x > this.xMax) this.xMax = x
    if (y < this.yMin) this.yMin = y
    if (y > this.yMax) this.yMax = y
  }
}

function quadratic(p0: number, p1: number, p2: number, t: number) {
  const mt = 1 - t
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2
}

/** Where a quadratic's derivative is zero, if that's inside the curve. */
function quadraticExtremum(p0: number, p1: number, p2: number) {
  const denom = p0 - 2 * p1 + p2
  if (denom === 0) return null
  const t = (p0 - p1) / denom
  return t > 0 && t < 1 ? t : null
}

function cubic(p0: number, p1: number, p2: number, p3: number, t: number) {
  const mt = 1 - t
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  )
}

/** Where a cubic's derivative is zero, inside the curve. */
function cubicExtrema(p0: number, p1: number, p2: number, p3: number) {
  // The derivative over 3 is a t^2 + b t + c
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * (p0 - 2 * p1 + p2)
  const c = p1 - p0

  const roots: number[] = []
  if (Math.abs(a) < 1e-12) {
    if (b !== 0) roots.push(-c / b)
  } else {
    const disc = b * b - 4 * a * c
    if (disc >= 0) {
      const sqrt = Math.sqrt(disc)
      roots.push((-b + sqrt) / (2 * a), (-b - sqrt) / (2 * a))
    }
  }

  return roots.filter((t) => t > 0 && t < 1)
}
