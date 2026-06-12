import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1,
  reporter: process.env.CI ? [['dot']] : [['list']],
  use: {
    trace: 'retain-on-failure'
  }
})
