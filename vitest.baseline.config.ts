import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '~': __dirname } },
  test: {
    environment: 'node',
    include: ['benchmarks/**/*.baseline.ts'],
    testTimeout: 240_000
  }
})
