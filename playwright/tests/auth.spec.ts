import { test, expect } from '@playwright/test';
import { loginAsTestUser, quickLoginAsTestUser, TEST_USER } from '../lib';

/**
 * Authentication Tests
 * 
 * Validates that the login flow works correctly.
 */

test.describe('Authentication', () => {
  test('should display the login page', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h1')).toHaveText('Velkommen tilbage');
    await expect(page.locator('input[placeholder*="Mads"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="2y-2025"]')).toBeVisible();
  });
  
  test('should login successfully with test user', async ({ page }) => {
    await loginAsTestUser(page);
    
    // Should be on tasks page
    await expect(page).toHaveURL('/tasks');
  });
  
  test('should login using quick login button', async ({ page }) => {
    await quickLoginAsTestUser(page);
    
    // Should be on tasks page
    await expect(page).toHaveURL('/tasks');
  });
  
  test('should access test lab after login', async ({ page }) => {
    await quickLoginAsTestUser(page);
    await page.goto('/test-lab');
    
    // Should see the test lab
    await expect(page.locator('.testlab__hero')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Generator Test Lab');
  });
  
  test('should redirect to login when accessing test lab without auth', async ({ page }) => {
    await page.goto('/test-lab');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });
});

