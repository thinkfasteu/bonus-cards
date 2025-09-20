import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/desktop',
  timeout: 30000,
  fullyParallel: false, // Electron tests should run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Only one worker for Electron tests
  reporter: 'html',
  
  use: {
    // Global test settings
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
    },
  ],
});