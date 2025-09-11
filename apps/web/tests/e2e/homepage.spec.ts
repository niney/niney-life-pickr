import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the app title', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Niney Life Pickr');
  });

  test('should display Korean subtitle', async ({ page }) => {
    // Check Korean subtitle
    const subtitle = page.locator('p').filter({ hasText: '인생의 선택을 도와드립니다' });
    await expect(subtitle).toBeVisible();
  });

  test('should have working counter', async ({ page }) => {
    // Check initial counter value
    const counterValue = page.locator('p.text-4xl.font-bold');
    await expect(counterValue).toContainText('0');
    
    // Find the increment button with Korean text
    const counterButton = page.locator('button').filter({ hasText: '증가' });
    await expect(counterButton).toBeVisible();
    
    // Click the button
    await counterButton.click();
    
    // Check if counter incremented
    await expect(counterValue).toContainText('1');
    
    // Click again
    await counterButton.click();
    
    // Check if counter incremented again
    await expect(counterValue).toContainText('2');
  });

  test('should have counter test label', async ({ page }) => {
    // Check for counter test label
    const counterLabel = page.locator('p').filter({ hasText: '카운터 테스트' });
    await expect(counterLabel).toBeVisible();
  });

  test('should have navigation buttons', async ({ page }) => {
    // Check for Korean navigation buttons
    const foodButton = page.locator('button').filter({ hasText: '음식 선택' });
    const placeButton = page.locator('button').filter({ hasText: '장소 선택' });
    const activityButton = page.locator('button').filter({ hasText: '활동 선택' });
    const settingsButton = page.locator('button').filter({ hasText: '설정' });
    
    await expect(foodButton).toBeVisible();
    await expect(placeButton).toBeVisible();
    await expect(activityButton).toBeVisible();
    await expect(settingsButton).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('h1')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Niney Life Pickr/);
    
    // Check viewport meta tag
    const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
    expect(viewport).toContain('width=device-width');
  });
});

test.describe('PWA Features', () => {
  test('should have manifest link', async ({ page }) => {
    await page.goto('/');
    
    // Check if manifest link exists
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');
  });

  test('should have service worker support', async ({ page }) => {
    // This test checks if service worker is supported, not if it's registered
    // In development, service worker might not be registered
    await page.goto('/');
    
    // Check if service worker API is available
    const serviceWorkerSupported = await page.evaluate(() => {
      return 'serviceWorker' in navigator;
    });
    
    expect(serviceWorkerSupported).toBeTruthy();
  });

  test.skip('should register service worker in production', async ({ page }) => {
    // Skip this test as it requires production build
    // Service worker is typically disabled in development
    await page.goto('/');
    
    // Wait for service worker to register
    await page.waitForTimeout(3000);
    
    // Check if service worker is registered
    const hasServiceWorker = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });
    
    expect(hasServiceWorker).toBeTruthy();
  });
});