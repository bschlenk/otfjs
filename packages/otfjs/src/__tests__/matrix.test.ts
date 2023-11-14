import { describe, it, expect } from 'vitest'
import { Matrix } from '../matrix.js'

describe('Matrix', () => {
  describe('#constructor()', () => {
    it('should construct a matrix from 6 numbers', () => {
      const matrix = new Matrix(1, 2, 3, 4, 5, 6)
      expect(matrix.values).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('should construct a matrix from an array', () => {
      const matrix = new Matrix([1, 2, 3, 4, 5, 6])
      expect(matrix.values).toEqual([1, 2, 3, 4, 5, 6])
    })

    it('should construct an identity matrix if no arguments are given', () => {
      const matrix = new Matrix()
      expect(matrix.values).toEqual([1, 0, 0, 1, 0, 0])
    })
  })
})
