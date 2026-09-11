import { ContractReporter } from '@beecode/msh-test-contractor/contract-reporter'
import { contractYamlPlugin } from '@beecode/msh-test-contractor/vitest-plugin'
import tsconfigPaths from 'vite-tsconfig-paths'
import { coverageConfigDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths(), contractYamlPlugin()],
  test: {
    coverage: {
      exclude: ['lib/**', 'src/index.ts', 'src/**/__fixtures__/**', ...coverageConfigDefaults.exclude],
    },
    environment: 'node',
    exclude: ['src/**/__fixtures__/**'],
    include: ['src/**/*.contract.yaml'],
    mockReset: true,
    passWithNoTests: true,
    reporters: [new ContractReporter()],
    server: {
      deps: {
        inline: ['@beecode/msh-test-contractor'],
      },
    },
    watch: false,
  },
})
