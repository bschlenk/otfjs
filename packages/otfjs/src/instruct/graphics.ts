export type GraphicsState = typeof DEFAULTS

const DEFAULTS = {
  autoFlip: true,
  // TODO: not sure what this means
  controlValueCutIn: 17 / 16, // pixels
  deltaBase: 9,
  deltaShift: 3,
  dualProjectionVectors: { x: 0, y: 0 },
  freedomVector: { x: 1, y: 0 },
  zp0: 1,
  zp1: 1,
  zp2: 1,
  instructControl: 0,
  loop: 1,
  minimumDistance: 1,
  projectionVector: { x: 1, y: 0 },
  // TODO: make an enum, 0 is halfGrid, 1 is grid, 2 is doubleGrid, 3 is roundDownToGrid, 4 is roundUpToGrid, 5 is off
  roundState: 1,
  rp0: 0,
  rp1: 0,
  rp2: 0,
  scanControl: false,
  singeWidthCutIn: 0,
  singleWidthValue: 0,
}

export function makeGraphicsState() {
  return { ...DEFAULTS }
}
