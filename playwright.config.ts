import { defineConfig, devices } from '@playwright/test';
import { config as envConfig } from './tests/helpers/env';

/**
 * Environment: TEST_ENV=stage|uat (default stage).
 * Stage keeps using tests/config.json when present.
 */
const slowMo = process.env.CI ? 0 : Number(process.env.PW_SLOW_MO ?? 300);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 180_000,
  expect: {
    timeout: 20_000,
    toHaveScreenshot: {
      maxDiffPixels: 150,
      threshold: 0.25,
      animations: 'disabled',
    },
  },
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    /* Origin from active env — page.goto('/login') works; full URLs still fine */
    baseURL: envConfig.origin,

    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 45_000,
    navigationTimeout: 60_000,
    viewport: { width: 1280, height: 720 },
    launchOptions: {
      slowMo,
    },
  },

  projects: [
    {
      name: 'chromium',
      testIgnore: '**/*.visual.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'visual',
      testMatch: '**/*.visual.spec.ts',
      fullyParallel: false,
      retries: process.env.CI ? 1 : 0,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        launchOptions: { slowMo: 0 },
      },
    },
  ],
});
