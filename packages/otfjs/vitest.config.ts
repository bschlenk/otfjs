import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // test and benchmark the buffer sources, not whatever was last built
    // into its dist/
    alias: {
      '@otfjs/buffer': fileURLToPath(
        new URL('../otfjs-buffer/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    // tsc compiles test files into dist/, so only run the sources
    include: ['src/**/*.test.ts'],
    benchmark: { include: ['bench/**/*.bench.ts'] },
  },
})
