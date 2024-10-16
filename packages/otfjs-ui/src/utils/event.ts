import * as vec from '@bschlenk/vec'

export interface HasClientXY {
  clientX: number
  clientY: number
}

export interface HasMovementXY {
  movementX: number
  movementY: number
}

export interface HasDeltaXY {
  deltaX: number
  deltaY: number
}

export interface HasPreventDefault {
  preventDefault(): void
}

export interface HasStopPropagation {
  stopPropagation(): void
}

export const PREVENT_DRAG = {
  onDragOver: preventDefault,
  onDrop: preventDefault,
}

export function preventDefault(e: HasPreventDefault) {
  e.preventDefault()
}

export function stopPropagation(e: HasStopPropagation) {
  e.stopPropagation()
}

/**
 * Get the mouse position of a user event, relative to a given HTMLElement.
 * @param e The event to read clientX and clientY off of.
 * @param target The HTMLElement to get the mouse position relative to.
 * @returns A Vector object.
 */
export function relativeMouse(e: HasClientXY, target: HTMLElement): vec.Vector {
  return vec.subtract(vec.fromClientXY(e), vec.fromElementTopLeft(target))
}

export function addListener<K extends keyof HTMLElementEventMap>(
  el: HTMLElement,
  type: K,
  cb: (this: HTMLElement, e: HTMLElementEventMap[K]) => void,
  opts?: boolean | AddEventListenerOptions,
) {
  el.addEventListener(type, cb, opts)
  return () => el.removeEventListener(type, cb, opts)
}

export function combineListeners(
  ...listeners: ((() => void) | null | undefined | false)[]
) {
  return () => {
    for (const fn of listeners) {
      if (fn) fn()
    }
  }
}
