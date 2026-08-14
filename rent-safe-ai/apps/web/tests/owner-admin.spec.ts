import { test, expect } from '@playwright/test';
test('owner dashboard does not expose private verification data', async ({ page }) => { await page.goto('/owner/dashboard'); await expect(page).toHaveTitle(/RentSafe/i); await expect(page.locator('body')).not.toContainText(/aadhaar|account number|encryptedToken/i); });
test('reviewer payments page is a separate admin surface', async ({ page }) => { await page.goto('/reviewer/payments'); await expect(page.locator('body')).toContainText(/payment operations/i); });
