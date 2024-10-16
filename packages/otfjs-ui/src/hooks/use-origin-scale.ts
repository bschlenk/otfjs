import { useEffect, useRef, useState } from 'react'
import * as vec from '@bschlenk/vec'

import { gestureToMatrix, useZoomer } from './zoomer'

const DEFAULT = { origin: vec.ZERO, scale: 1 }

export function useOriginScale(
  ref: React.RefObject<HTMLElement>,
  defaultOriginScale = DEFAULT,
) {
  const origin = useRef(defaultOriginScale.origin)
  const matrix = useRef<DOMMatrix>(
    new DOMMatrix([
      defaultOriginScale.scale,
      0,
      0,
      defaultOriginScale.scale,
      defaultOriginScale.origin.x,
      defaultOriginScale.origin.y,
    ]),
  )

  const [originScale, setOriginScale] = useState(defaultOriginScale)

  useEffect(() => {
    setOriginScale(defaultOriginScale)
  }, [defaultOriginScale])

  useZoomer(ref, {
    startGesture(gesture) {
      origin.current = gesture.origin
      matrix.current = new DOMMatrix([
        originScale.scale,
        0,
        0,
        originScale.scale,
        originScale.origin.x,
        originScale.origin.y,
      ])

      const m = gestureToMatrix(gesture, origin.current).multiply(
        matrix.current,
      )

      setOriginScale({
        origin: vec.vec(m.e, m.f),
        scale: m.a,
      })
    },

    doGesture(gesture) {
      const m = gestureToMatrix(gesture, origin.current).multiply(
        matrix.current,
      )

      setOriginScale({
        origin: vec.vec(m.e, m.f),
        scale: m.a,
      })
    },
  })

  return originScale
}

/*
const DEFAULT = { origin: { x: 0, y: 0 }, scale: 1 }

export function useOriginScale(
  ref: RefObject<HTMLElement>,
  defaultOriginScale = DEFAULT,
) {
  const [originScale, setOriginScale] = useState(defaultOriginScale)
  const lastDefault = usePrevious(defaultOriginScale)

  useEffect(() => {
    if (
      lastDefault &&
      vec.equals(lastDefault.origin, originScale.origin) &&
      lastDefault.scale === originScale.scale
    ) {
      setOriginScale(defaultOriginScale)
    }
  }, [defaultOriginScale, lastDefault, originScale])

  useEffect(() => {
    ref.current!.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault()

        const { deltaX, deltaY, ctrlKey } = e

        if (ctrlKey) {
          // zoom
          const mouse = relativeMouse(e, e.currentTarget! as HTMLElement)

          setOriginScale((value) => {
            const scaleBy = 1 - deltaY / 100

            const origin = vec.subtract(
              mouse,
              vec.scale(vec.subtract(mouse, value.origin), scaleBy),
            )
            const scale = value.scale * scaleBy

            return { origin, scale }
          })
        } else {
          // pan
          setOriginScale((value) => {
            return {
              ...value,
              origin: vec.add(value.origin, { x: -deltaX / 2, y: -deltaY / 2 }),
            }
          })
        }
      },
      { passive: false },
    )
  }, [ref])

  return originScale
}
*/
