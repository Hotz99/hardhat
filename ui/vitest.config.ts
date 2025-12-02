import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30000, // 30s for blockchain transactions
    hookTimeout: 60000, // 60s for setup (hardhat spawn + deploy)
    globalSetup: './lib/blockchain/__tests__/e2e/setup.ts',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
