import { test, expect } from '@playwright/test';

// Test account from CLAUDE.md
const TEST_ACCOUNT = {
  email: 'niney@ks.com',
  password: 'tester',
};

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure we start from logged-out state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload();
  });

  test('should login successfully and navigate to home', async ({ page }) => {
    // Setup alert handler
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('alert');
      expect(dialog.message()).toContain('로그인');
      await dialog.accept();
    });

    await page.goto('/login');

    // Fill in the form
    await page.getByPlaceholder('이메일을 입력하세요').fill(TEST_ACCOUNT.email);
    await page.getByPlaceholder('비밀번호를 입력하세요').fill(TEST_ACCOUNT.password);

    // Click login button
    await page.getByText('로그인', { exact: true }).click();

    // Wait for navigation to home page
    await page.waitForURL('/');

    // Check that we're on the home page
    await expect(page).toHaveURL('/');
  });
});
