import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30000,
  workers: 1,
  // One retry on CI: a slow shared runner flakes about 1 run in 20 on the schedule-history jump test (see docs/hub/backlog.md).
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['dot']] : [['list']],
  use: {
    trace: 'retain-on-failure'
  }
})
