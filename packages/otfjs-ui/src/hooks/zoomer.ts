import { useEffect, useRef } from 'react'
import * as vec from '@bschlenk/vec'

import { relativeMouse } from '../utils/event'

const HAS_GESTURE_EVENTS = typeof GestureEvent !== 'undefined'
const HAS_TOUCH_EVENTS = typeof TouchEvent !== 'undefined'

const WHEEL_SCALE_SPEEDUP = 2
const WHEEL_TRANSLATION_SPEEDUP = 2
const WHEEL_BATCH_TIMEOUT = 200
const DELTA_LINE_MULTIPLIER = 8
const DELTA_PAGE_MULTIPLIER = 24
const MAX_WHEEL_DELTA = 24

interface GestureInfo {
  target: HTMLElement
  origin: vec.Vector
  scale: number
  rotation: number
  translation: vec.Vector
}

interface ZoomerContext {
  startGesture?: (gesture: GestureInfo) => void
  doGesture?: (gesture: GestureInfo) => void
  endGesture?: (gesture: GestureInfo) => void
}

export function useZoomer(
  ref: React.RefObject<HTMLElement>,
  ctx: ZoomerContext,
) {
  const ctxRef = useRef(ctx)

  useEffect(() => {
    Object.assign(ctxRef.current, ctx)
  }, [ctx])

  useEffect(() => {
    okzoomer(ref.current!, ctxRef.current)
  }, [])
}

// https://danburzo.ro/dom-gestures/
function okzoomer(container: HTMLElement, opts: ZoomerContext = {}) {
  let wheelGesture: GestureInfo | null = null
  let timer: number | undefined

  container.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault()

      const delta = normalizeWheel(e)
      const origin = relativeMouse(e, container)

      if (!wheelGesture) {
        wheelGesture = {
          target: container,
          origin,
          scale: 1,
          rotation: 0,
          translation: vec.ZERO,
        }
        opts.startGesture?.(wheelGesture)
      }

      if (e.ctrlKey) {
        // pinch-zoom gesture
        const factor =
          delta.y <= 0 ?
            1 - (WHEEL_SCALE_SPEEDUP * delta.y) / 100
          : 1 / (1 + (WHEEL_SCALE_SPEEDUP * delta.y) / 100)

        wheelGesture = {
          ...wheelGesture,
          origin,
          scale: wheelGesture.scale * factor,
        }
      } else {
        // pan gesture
        wheelGesture = {
          ...wheelGesture,
          origin,
          translation: vec.subtract(
            wheelGesture.translation,
            vec.scale(delta, WHEEL_TRANSLATION_SPEEDUP),
          ),
        }
      }

      opts.doGesture?.(wheelGesture)

      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (wheelGesture) {
          opts.endGesture?.(wheelGesture)
          wheelGesture = null
        }
      }, WHEEL_BATCH_TIMEOUT)
    },
    { passive: false },
  )

  let initialTouches: TouchList | undefined
  let touchGesture: GestureInfo | null = null

  function touchMove(e: TouchEvent) {
    if (e.touches.length === 2) {
      e.preventDefault()

      const mpInit = midpoint(initialTouches!)
      const mpCurr = midpoint(e.touches)

      touchGesture = {
        target: container,
        origin: mpInit,
        scale: e.scale ?? distance(e.touches) / distance(initialTouches!),
        rotation: e.rotation ?? angle(e.touches) - angle(initialTouches!),
        translation: vec.subtract(mpCurr, mpInit),
      }

      opts.doGesture?.(touchGesture)
    }
  }

  container.addEventListener(
    'touchstart',
    function watchTouches(e: TouchEvent) {
      if (e.touches.length === 2) {
        initialTouches = e.touches
        touchGesture = {
          target: container,
          scale: 1,
          rotation: 0,
          translation: vec.ZERO,
          origin: midpoint(initialTouches),
        }
        if (e.type === 'touchstart') e.preventDefault()

        opts.startGesture?.(touchGesture)
        container.addEventListener('touchmove', touchMove, { passive: false })
        container.addEventListener('touchend', watchTouches)
        container.addEventListener('touchcancel', watchTouches)
      } else if (touchGesture) {
        opts.endGesture?.(touchGesture)
        touchGesture = null
        container.removeEventListener('touchmove', touchMove)
        container.removeEventListener('touchend', watchTouches)
        container.removeEventListener('touchcancel', watchTouches)
      }
    },
    { passive: false },
  )

  if (HAS_GESTURE_EVENTS && !HAS_TOUCH_EVENTS) {
    let inGesture = false

    container.addEventListener(
      'gesturestart',
      (e) => {
        e.preventDefault()

        if (!inGesture) {
          opts.startGesture?.({
            target: container,
            translation: vec.ZERO,
            scale: e.scale,
            rotation: e.rotation,
            origin: vec.fromClientXY(e),
          })
          inGesture = true
        }
      },
      { passive: false },
    )

    container.addEventListener(
      'gesturechange',
      (e) => {
        e.preventDefault()

        if (inGesture) {
          opts.doGesture?.({
            target: container,
            translation: vec.ZERO,
            scale: e.scale,
            rotation: e.rotation,
            origin: vec.fromClientXY(e),
          })
        }
      },
      { passive: false },
    )

    container.addEventListener('gestureend', (e) => {
      if (inGesture) {
        opts.endGesture?.({
          target: container,
          translation: vec.ZERO,
          scale: e.scale,
          rotation: e.rotation,
          origin: vec.fromClientXY(e),
        })
        inGesture = false
      }
    })
  }
}

function gestureToMatrix(gesture: GestureInfo, origin: vec.Vector) {
  return (
    new DOMMatrix()
      .translate(origin.x, origin.y)
      .translate(gesture.translation.x || 0, gesture.translation.y || 0)
      // .rotate(gesture.rotation || 0)
      .scale(gesture.scale || 1)
      .translate(-origin.x, -origin.y)
  )
}

function getOrigin(el: HTMLElement, gesture: GestureInfo) {
  return vec.subtract(gesture.origin, vec.fromElementTopLeft(el))
}

function applyMatrix(el: Element, matrix: DOMMatrix) {
  if (el instanceof HTMLElement) {
    el.style.transform = matrix as unknown as string
    return
  }

  if (el instanceof SVGElement) {
    el.setAttribute('transform', matrix as unknown as string)
    return
  }

  throw new Error('Expected HTML or SVG element')
}

export { applyMatrix, gestureToMatrix, getOrigin, okzoomer }

function limit(delta: number, maxDelta: number) {
  return Math.sign(delta) * Math.min(maxDelta, Math.abs(delta))
}

function normalizeWheel(e: WheelEvent) {
  let dx = e.deltaX
  let dy = e.deltaY

  if (e.shiftKey && dx === 0) {
    ;[dx, dy] = [dy, dx]
  }

  if (e.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    dx *= DELTA_LINE_MULTIPLIER
    dy *= DELTA_LINE_MULTIPLIER
  } else if (e.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    dx *= DELTA_PAGE_MULTIPLIER
    dy *= DELTA_PAGE_MULTIPLIER
  }

  return vec.vec(limit(dx, MAX_WHEEL_DELTA), limit(dy, MAX_WHEEL_DELTA))
}

function midpoint(touches: TouchList) {
  const [t1, t2] = touches
  return vec.midpoint(vec.fromClientXY(t1), vec.fromClientXY(t2))
}

function distance(touches: TouchList) {
  const [t1, t2] = touches
  return vec.distance(vec.fromClientXY(t1), vec.fromClientXY(t2))
}

function angle(touches: TouchList) {
  const [t1, t2] = touches
  return vec.angle(vec.subtract(vec.fromClientXY(t2), vec.fromClientXY(t1)))
}
