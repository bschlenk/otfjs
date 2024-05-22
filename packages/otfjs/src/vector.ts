/** @const {number} */
export const PRECISION = 1e-6

export class Vector {
  constructor(
    public readonly x: number,
    public readonly y: number,
  ) {}

  static of(x: number, y: number) {
    return new Vector(x, y)
  }

  static zero() {
    return ZERO
  }

  /**
   * Return a vector pointing in the same direction
   * but with the given `magnitude`.
   */
  withMagnitude(magnitude: number) {
    return this.normalize().scale(magnitude)
  }

  /**
   * Return true if this and other are the same vector.
   * Takes PRECISION into account due to floating point rounding errors.
   */
  equals(other: Vector) {
    return (
      Math.abs(this.x - other.x) <= PRECISION &&
      Math.abs(this.y - other.y) <= PRECISION
    )
  }

  /**
   * Return whether this vector represents the zero vector.
   */
  isZero() {
    return this.equals(ZERO)
  }

  clone() {
    return new Vector(this.x, this.y)
  }

  scale(scalar: number) {
    return new Vector(this.x * scalar, this.y * scalar)
  }

  add(vector: Vector) {
    const { x, y } = vector
    return new Vector(this.x + x, this.y + y)
  }

  distance(other: Vector) {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2)
  }

  magnitude() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2))
  }

  /**
   * Get the angle in radians of this vector.
   */
  angle() {
    return Math.atan2(this.y, this.x)
  }

  /**
   * Returns a vector of magnitude 1, pointing in the original direction.
   */
  normalize() {
    return this.scale(1 / this.magnitude())
  }

  rotate(radians: number) {
    const newX = this.x * Math.cos(radians) - this.y * Math.sin(radians)
    const newY = this.x * Math.sin(radians) + this.y * Math.cos(radians)
    return new Vector(newX, newY)
  }

  /**
   * Returns the dot product of this vector and `other`.
   */
  dot(other: Vector) {
    return this.x * other.x + this.y * other.y
  }

  projectOnto(other: Vector) {
    return other.scale(this.dot(other) / other.dot(other))
  }
}

// This has to be defined after Vector for some reason.
/** @const {!Vector} */
const ZERO = new Vector(0, 0)
