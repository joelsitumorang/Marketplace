import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'Microsoft Edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge', // Menggunakan browser Edge yang sudah ter-install di Windows
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
