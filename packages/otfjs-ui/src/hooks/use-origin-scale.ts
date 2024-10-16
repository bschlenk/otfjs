import { useEffect, useRef, useState } from 'react'
import * as vec from '@bschlenk/vec'

import { gestureToMatrix, useZoomer } from './zoomer'

interface OriginScale {
  origin: vec.Vector
  scale: number
}

const DEFAULT: OriginScale = { origin: vec.ZERO, scale: 1 }

export function useOriginScale(
  ref: React.RefObject<HTMLElement>,
  defaultOriginScale = DEFAULT,
) {
  const origin = useRef(defaultOriginScale.origin)
  const matrix = useRef(originScaleToDomMatrix(defaultOriginScale))

  const [originScale, setOriginScale] = useState(defaultOriginScale)

  useEffect(() => {
    setOriginScale(defaultOriginScale)
  }, [defaultOriginScale])

  useZoomer(ref, {
    onGestureStart(e) {
      origin.current = e.origin
      matrix.current = originScaleToDomMatrix(originScale)
    },

    onGesture(e) {
      const m = gestureToMatrix(e, origin.current).multiply(matrix.current)
      setOriginScale(domMatrixToOriginScale(m))
    },
  })

  return originScale
}

function originScaleToDomMatrix(originScale: OriginScale): DOMMatrix {
  return new DOMMatrix([
    originScale.scale,
    0,
    0,
    originScale.scale,
    originScale.origin.x,
    originScale.origin.y,
  ])
}

function domMatrixToOriginScale(matrix: DOMMatrix): OriginScale {
  return {
    origin: vec.vec(matrix.e, matrix.f),
    scale: matrix.a,
  }
}
