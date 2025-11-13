import { useEffect, useRef } from 'react'
import * as vec from '@bschlenk/vec'

import { addListener, combineListeners, relativeMouse } from '../utils/event'

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
  onGestureStart?: (gesture: GestureInfo) => void
  onGesture?: (gesture: GestureInfo) => void
  onGestureEnd?: (gesture: GestureInfo) => void
}

export function useZoomer(
  ref: React.RefObject<HTMLElement>,
  ctx: ZoomerContext,
) {
  const ctxRef = useRef(ctx)

  useEffect(() => {
    Object.assign(ctxRef.current, ctx)
  }, [ctx])

  useEffect(() => okzoomer(ref.current, ctxRef.current), [])
}

// https://danburzo.ro/dom-gestures/
function okzoomer(container: HTMLElement, opts: ZoomerContext = {}) {
  return combineListeners(
    addWheelListener(container, opts),
    HAS_TOUCH_EVENTS && addTouchListener(container, opts),
    HAS_GESTURE_EVENTS &&
      !HAS_TOUCH_EVENTS &&
      addGestureListener(container, opts),
  )
}

function addWheelListener(target: HTMLElement, opts: ZoomerContext) {
  let wheelGesture: GestureInfo | null = null
  let timer: number | undefined

  return addListener(
    target,
    'wheel',
    (e) => {
      e.preventDefault()

      const delta = normalizeWheel(e)
      const origin = relativeMouse(e, target)

      if (!wheelGesture) {
        wheelGesture = {
          target,
          origin,
          scale: 1,
          rotation: 0,
          translation: vec.ZERO,
        }
        opts.onGestureStart?.(wheelGesture)
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

      opts.onGesture?.(wheelGesture)

      if (timer) window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (wheelGesture) {
          opts.onGestureEnd?.(wheelGesture)
          wheelGesture = null
        }
      }, WHEEL_BATCH_TIMEOUT)
    },
    { passive: false },
  )
}

function addTouchListener(target: HTMLElement, opts: ZoomerContext) {
  let initialTouches: TouchList | undefined
  let touchGesture: GestureInfo | null = null

  function touchMove(e: TouchEvent) {
    if (e.touches.length !== 2) return

    e.preventDefault()

    const tl = vec.fromElementTopLeft(target)

    const mpInit = vec.subtract(midpoint(initialTouches!), tl)
    const mpCurr = vec.subtract(midpoint(e.touches), tl)

    touchGesture = {
      target,
      origin: mpInit,
      scale: e.scale ?? distance(e.touches) / distance(initialTouches!),
      rotation: e.rotation ?? angle(e.touches) - angle(initialTouches!),
      translation: vec.subtract(mpCurr, mpInit),
    }

    opts.onGesture?.(touchGesture)
  }

  return addListener(
    target,
    'touchstart',
    function watchTouches(e: TouchEvent) {
      if (e.touches.length === 2) {
        initialTouches = e.touches
        touchGesture = {
          target,
          scale: 1,
          rotation: 0,
          translation: vec.ZERO,
          origin: vec.subtract(
            midpoint(initialTouches),
            vec.fromElementTopLeft(target),
          ),
        }

        if (e.type === 'touchstart') e.preventDefault()

        opts.onGestureStart?.(touchGesture)
        opts.onGesture?.(touchGesture)

        target.addEventListener('touchmove', touchMove, { passive: false })
        target.addEventListener('touchend', watchTouches)
        target.addEventListener('touchcancel', watchTouches)
      } else if (touchGesture) {
        opts.onGestureEnd?.(touchGesture)
        touchGesture = null
        target.removeEventListener('touchmove', touchMove)
        target.removeEventListener('touchend', watchTouches)
        target.removeEventListener('touchcancel', watchTouches)
      }
    },
    { passive: false },
  )
}

function addGestureListener(target: HTMLElement, opts: ZoomerContext) {
  let inGesture = false
  let origin = vec.ZERO

  return combineListeners(
    addListener(
      target,
      'gesturestart',
      (e) => {
        e.preventDefault()

        if (inGesture) return
        inGesture = true

        origin = relativeMouse(e, target)

        const event = {
          target,
          translation: vec.ZERO,
          scale: e.scale,
          rotation: e.rotation,
          origin,
        }

        opts.onGestureStart?.(event)
        opts.onGesture?.(event)
      },
      { passive: false },
    ),

    addListener(
      target,
      'gesturechange',
      (e) => {
        e.preventDefault()

        if (inGesture) {
          opts.onGesture?.({
            target,
            translation: vec.ZERO,
            scale: e.scale,
            rotation: e.rotation,
            origin,
          })
        }
      },
      { passive: false },
    ),

    addListener(target, 'gestureend', (e) => {
      if (!inGesture) return
      inGesture = false

      opts.onGestureEnd?.({
        target,
        translation: vec.ZERO,
        scale: e.scale,
        rotation: e.rotation,
        origin,
      })
    }),
  )
}

export function gestureToMatrix(gesture: GestureInfo, origin: vec.Vector) {
  return (
    new DOMMatrix()
      .translate(origin.x, origin.y)
      .translate(gesture.translation.x || 0, gesture.translation.y || 0)
      // .rotate(gesture.rotation || 0)
      .scale(gesture.scale || 1)
      .translate(-origin.x, -origin.y)
  )
}

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
