import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Test against the built output rather than the dev server — that is the
  // only way the production bundle gets checked.
  //
  // `--host` is required: without it vite preview does not bind 127.0.0.1 and
  // Playwright waits out its timeout.
  // Never reuse a running server. It would skip the build in the command
  // above, and the whole suite would silently pass against a stale bundle —
  // which has already happened twice. A build takes about a second; a green
  // run on old code costs a lot more than that.
  webServer: {
    command: 'npx vite build && npx vite preview --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
