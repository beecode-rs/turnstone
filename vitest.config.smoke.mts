import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      stream: path.resolve(__dirname, 'node_modules/stream-browserify/index.js'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/app-boot/__tests__/*.test.ts',
      'src/business/service/__tests__/*.test.ts',
      'src/lib/__tests__/*.test.ts',
      'src/__internal__/polyfill-stubs/__tests__/*.test.ts',
    ],
    testTimeout: 20000,
    watch: false,
  },
})
