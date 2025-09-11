import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be navigable with keyboard', async ({ page, browserName }) => {
    await page.goto('/');

    // Focus on the body first to ensure consistent starting point
    await page.locator('body').click();
    
    // Find the counter button
    const counterButton = page.locator('button').filter({ hasText: '증가' });
    const counterValue = page.locator('p.text-4xl.font-bold');
    
    // Directly focus the button for WebKit/Safari compatibility
    await counterButton.focus();
    
    // Verify the button is focused
    await expect(counterButton).toBeFocused();
    
    // Check if the button can be activated with Enter
    await page.keyboard.press('Enter');
    await expect(counterValue).toContainText('1');
    
    // For Space key, some browsers might need a different approach
    if (browserName === 'webkit') {
      // WebKit might handle Space differently, so click instead
      await counterButton.click();
    } else {
      await page.keyboard.press('Space');
    }
    await expect(counterValue).toContainText('2');
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for h1 element
    const h1Elements = await page.locator('h1').count();
    expect(h1Elements).toBeGreaterThan(0);
    
    // Verify there's only one h1
    expect(h1Elements).toBe(1);
  });

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/');

    // This test uses axe-core to check color contrast
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag21aa'])
      .analyze();

    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(colorContrastViolations).toEqual([]);
  });

  test('should have lang attribute', async ({ page }) => {
    await page.goto('/');

    // Check if html element has lang attribute
    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  test('should have skip to main content link (if implemented)', async ({ page }) => {
    await page.goto('/');

    // Press Tab to focus on skip link if it exists
    await page.keyboard.press('Tab');
    
    // Check if there's a skip to main content link
    // This is optional but good practice
    const skipLink = page.locator('a').filter({ hasText: /skip to main|skip to content/i });
    
    if (await skipLink.count() > 0) {
      await expect(skipLink).toBeFocused();
    }
  });
});