// https://learn.microsoft.com/en-us/typography/opentype/spec/tt_instructions#get-information

import { s } from '@otfjs/buffer-gen/schema'

// Which pieces of information the GETINFO instruction is asked for
export const GetinfoSelector = s.flags('GetinfoSelector', s.u32(), {
  version: 0,
  rotation: 1,
  stretch: 2,
  variations: 3,
  verticalPhantom: 4,
  greyscale: 5,
})
