import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // tsc compiles test files into dist/, so only run the sources
    include: ['src/**/*.test.ts'],
    benchmark: { include: ['bench/**/*.bench.ts'] },
  },
})
