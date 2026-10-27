import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    channel: 'msedge',
    trace: 'off',
  },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], channel: 'msedge' } }],
})
