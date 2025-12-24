import { test as base } from '@playwright/test';
import { TestLabPage, setupTestLab } from '../lib';

/**
 * Extended test fixtures for Mat generator testing
 */

// Extend the base test with our fixtures
export const test = base.extend<{
  testLabPage: TestLabPage;
}>({
  // Provide a logged-in TestLabPage for each test
  testLabPage: async ({ page }, use) => {
    // Setup: login and navigate to test lab
    await setupTestLab(page);
    
    // Create page object
    const testLabPage = new TestLabPage(page);
    
    // Use the fixture
    await use(testLabPage);
    
    // Cleanup: close any open modals
    await testLabPage.closeModal();
  },
});

export { expect } from '@playwright/test';

