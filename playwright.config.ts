import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [['list']],

  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.E2E_BASE_URL,
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { headless: false },
      },
    },
  ],
});
