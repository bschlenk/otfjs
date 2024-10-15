interface GestureEvent extends UIEvent {
  readonly rotation: number
  readonly scale: number
  readonly clientX: number
  readonly clientY: number
}

declare const GestureEvent: {
  prototype: GestureEvent
  new (type: string): GestureEvent
}

interface TouchEvent {
  scale?: number
  rotation?: number
}

interface GlobalEventHandlersEventMap {
  gesturestart: GestureEvent
  gesturechange: GestureEvent
  gestureend: GestureEvent
}
