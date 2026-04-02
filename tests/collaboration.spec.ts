import { test, expect } from '@playwright/test';

test('user can find a match and see the editor', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.fill('input[name="username"]', 'testuser');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.selectOption('select[name="topic"]', 'Arrays');
  await page.click('button:has-text("Find Match")');
  await expect(page).toHaveURL(/.*session/, { timeout: 30000 });
  const editor = page.locator('.monaco-editor');
  await expect(editor).toBeVisible();
});