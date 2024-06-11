import { areClose } from './utils.js'

export interface Vector {
  x: number
  y: number
}

export const ZERO: Vector = { x: 0, y: 0 }

export function vec(x: number, y: number): Vector {
  return { x, y }
}

/**
 * Return a vector pointing in the same direction
 * but with the given `magnitude`.
 */
export function withMagnitude(vec: Vector, magnitude: number) {
  return scale(normalize(vec), magnitude)
}

/**
 * Return true if this and other are the same vector.
 * Takes PRECISION into account due to floating point rounding errors.
 */
export function equals(a: Vector, b: Vector) {
  return areClose(a.x, b.x) && areClose(a.y, b.y)
}

export function scale(vec: Vector, scalar: number) {
  return { x: vec.x * scalar, y: vec.y * scalar }
}

export function add(a: Vector, b: Vector) {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function addTo(a: Vector, b: Vector) {
  a.x += b.x
  a.y += b.y
}

export function subtract(a: Vector, b: Vector) {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function distanceSquared(a: Vector, b: Vector) {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2
}

export function distance(a: Vector, b: Vector) {
  return Math.sqrt(distanceSquared(a, b))
}

export function magnitude(vec: Vector) {
  return distance(ZERO, vec)
}

/**
 * Get the angle in radians of this vector.
 */
export function angle(vec: Vector) {
  return Math.atan2(vec.y, vec.x)
}

/**
 * Returns a vector of magnitude 1, pointing in the original direction.
 */
export function normalize(vec: Vector) {
  return scale(vec, 1 / magnitude(vec))
}

export function rotate90(vec: Vector) {
  return { x: -vec.y, y: vec.x }
}

export function rotate(vec: Vector, radians: number) {
  const x = vec.x * Math.cos(radians) - vec.y * Math.sin(radians)
  const y = vec.x * Math.sin(radians) + vec.y * Math.cos(radians)
  return { x, y }
}

/**
 * Returns the dot product of this vector and `other`.
 */
export function dot(a: Vector, b: Vector) {
  return a.x * b.x + a.y * b.y
}

export function projectOnto(a: Vector, b: Vector) {
  return scale(b, dot(a, b) / dot(b, b))
}

export function projectLength(a: Vector, b: Vector) {
  return dot(a, b) / magnitude(b)
}
