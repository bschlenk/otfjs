import { Vector } from '@bschlenk/vec'

export interface PathBuilder {
  moveTo(p: Vector): void
  lineTo(p: Vector): void
  quadraticCurveTo(p1: Vector, p2: Vector): void
  cubicCurveTo(p1: Vector, p2: Vector, p3: Vector): void
  closePath(): void
}

export class SvgPathBuilder {
  private d = ''

  moveTo(p: Vector) {
    this.d += 'M' + p.x + sep(p.y)
  }

  lineTo(p: Vector) {
    this.d += 'L' + p.x + sep(p.y)
  }

  quadraticCurveTo(p1: Vector, p2: Vector) {
    this.d += 'Q' + p1.x + sep(p1.y) + sep(p2.x) + sep(p2.y)
  }

  cubicCurveTo(p1: Vector, p2: Vector, p3: Vector) {
    this.d +=
      'C' + p1.x + sep(p1.y) + sep(p2.x) + sep(p2.y) + sep(p3.x) + sep(p3.y)
  }

  closePath() {
    this.d += 'Z'
  }

  toString() {
    return this.d
  }
}

export class CanvasPathBuilder {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  moveTo(p: Vector) {
    this.ctx.moveTo(p.x, p.y)
  }

  lineTo(p: Vector) {
    this.ctx.lineTo(p.x, p.y)
  }

  quadraticCurveTo(p1: Vector, p2: Vector) {
    this.ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y)
  }

  cubicCurveTo(p1: Vector, p2: Vector, p3: Vector) {
    this.ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
  }

  closePath() {
    this.ctx.closePath()
  }
}

/**
 * A number preceded by the separator it needs. Paths don't need one before
 * a negative number, since the minus sign separates it.
 */
function sep(n: number) {
  return n < 0 ? '' + n : ' ' + n
}
