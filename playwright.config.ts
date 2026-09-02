import { defineConfig, devices } from '@playwright/test';

/**
 * E2E smoke suite config (Phase 7).
 *
 * Specs live in `./e2e`. The webServer block boots the production build
 * (`npm run start`) so the suite exercises the same bundle Vercel ships;
 * run `npm run build` once before `npm run test:e2e`. See `e2e/README.md`.
 *
 * Browsers: only `chromium` is shipped. Install it with
 * `npx playwright install chromium` (~150MB) before the first run.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './playwright-report',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
