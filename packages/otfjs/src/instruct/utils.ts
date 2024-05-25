import { createFlagReader } from '../flags.js'

export const getinfoFlags = createFlagReader({
  version: 0,
  rotation: 1,
  stretch: 2,
  variations: 3,
  verticalPhantom: 4,
  greyscale: 5,
})
