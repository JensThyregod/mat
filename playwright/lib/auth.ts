import { Page } from '@playwright/test';

/**
 * Authentication helpers for the Mat test suite
 */

export interface TestUser {
  name: string;
  code: string;
}

// Default test user credentials
export const TEST_USER: TestUser = {
  name: 'test',
  code: 'test',
};

/**
 * Login as the test user
 * This is required to access the Test Lab
 */
export async function loginAsTestUser(page: Page, user: TestUser = TEST_USER): Promise<void> {
  // Navigate to login page
  await page.goto('/login');
  
  // Wait for the login form to be ready
  await page.waitForSelector('input[placeholder*="Mads"]');
  
  // Fill in credentials
  await page.fill('input[placeholder*="Mads"]', user.name);
  await page.fill('input[placeholder*="2y-2025"]', user.code);
  
  // Submit the form
  await page.click('button[type="submit"]');
  
  // Wait for navigation to complete
  await page.waitForURL('/tasks');
}

/**
 * Quick login using the "Use test user" button
 */
export async function quickLoginAsTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  
  // Click the "Brug test bruger" button
  await page.click('button:has-text("Brug test bruger")');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for navigation
  await page.waitForURL('/tasks');
}

/**
 * Navigate to the Test Lab (requires being logged in as test user)
 */
export async function goToTestLab(page: Page): Promise<void> {
  await page.goto('/test-lab');
  await page.waitForSelector('.testlab');
}

/**
 * Full setup: login and go to test lab
 */
export async function setupTestLab(page: Page): Promise<void> {
  await quickLoginAsTestUser(page);
  await goToTestLab(page);
}

