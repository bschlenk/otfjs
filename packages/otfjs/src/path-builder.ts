import { Vector } from '@bschlenk/vec'

export interface PathBuilder {
  moveTo(p: Vector): void
  lineTo(p: Vector): void
  quadraticCurveTo(p1: Vector, p2: Vector): void
  closePath(): void
}

export class SvgPathBuilder {
  private d = ''

  moveTo(p: Vector) {
    this.d += 'M' + join(p.x, p.y)
  }

  lineTo(p: Vector) {
    this.d += 'L' + join(p.x, p.y)
  }

  quadraticCurveTo(p1: Vector, p2: Vector) {
    this.d += 'Q' + join(p1.x, p1.y, p2.x, p2.y)
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

  closePath() {
    this.ctx.closePath()
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
