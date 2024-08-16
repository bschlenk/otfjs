import { RefObject, useEffect, useState } from 'react'
import * as vec from '@bschlenk/vec'

import { relativeMouse } from '../utils/event'
import { usePrevious } from './use-previous'

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
