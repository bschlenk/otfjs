import { defineConfig } from 'vitest/config'

export default defineConfig({
  // tsc compiles test files into dist/, so only run the sources
  test: { include: ['src/**/*.test.ts'] },
})
