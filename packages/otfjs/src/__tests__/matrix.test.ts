import { describe, expect, it } from 'vitest'

import * as mat from '../matrix.js'

describe('Matrix', () => {
  describe('mat()', () => {
    it('should create a Matrix from 6 numbers', () => {
      const matrix = mat.mat(1, 2, 3, 4, 5, 6)
      expect(matrix).toEqual({ xx: 1, xy: 2, yx: 3, yy: 4, dx: 5, dy: 6 })
    })
  })
})
