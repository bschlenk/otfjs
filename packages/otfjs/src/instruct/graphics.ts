export type GraphicsState = ReturnType<typeof makeGraphicsState>

export const enum RoundState {
  HALF_GRID = 0,
  GRID = 1,
  DOUBLE_GRID = 2,
  DOWN_TO_GRID = 3,
  UP_TO_GRID = 4,
  OFF = 5,
  CUSTOM = 6,
}

export function makeGraphicsState() {
  return {
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
    instructControl: {
      disableGridFitting: false,
      ignoreCvtParams: false,
      nativeClearTypeMode: false,
    },
    loop: 1,
    minimumDistance: 1,
    projectionVector: { x: 1, y: 0 },
    roundState: RoundState.GRID,
    roundStateCustom: { period: 0, phase: 0, threshold: 0 },
    rp0: 0,
    rp1: 0,
    rp2: 0,
    scanControl: {
      enabled: 0,
      rules: 0,
    },
    singeWidthCutIn: 0,
    singleWidthValue: 0,
  }
}
