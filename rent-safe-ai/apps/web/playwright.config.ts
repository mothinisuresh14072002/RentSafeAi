import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ testDir: './tests', timeout: 30_000, retries: process.env.CI ? 2 : 0, use: { baseURL: process.env.WEB_BASE_URL || 'http://127.0.0.1:3000', trace: 'retain-on-failure' }, projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }] });
