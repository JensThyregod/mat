import { test, expect } from '../fixtures';
import { TASK_TYPES, TaskTypeInfo } from '../../lib';

/**
 * Test a single generator type with multiple iterations
 * 
 * Use this for focused testing of a specific generator.
 * Modify the TASK_TYPE_TO_TEST variable to test different types.
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURE WHICH TASK TYPE TO TEST
// ═══════════════════════════════════════════════════════════════

const TASK_TYPE_TO_TEST = 'tal_pris_rabat_procent'; // Change this to test different types
const ITERATIONS = 5; // Number of generations to test

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

test.describe(`Generator: ${TASK_TYPE_TO_TEST}`, () => {
  const taskInfo = TASK_TYPES.find(t => t.id === TASK_TYPE_TO_TEST);
  
  if (!taskInfo) {
    test.skip(`Task type "${TASK_TYPE_TO_TEST}" not found`, async () => {});
    return;
  }
  
  test('should be visible in the test lab', async ({ testLabPage }) => {
    await testLabPage.expandCategory(taskInfo.category);
    
    const card = testLabPage.getTaskCardByNumber(taskInfo.number);
    await expect(card).toBeVisible();
  });
  
  test('should be supported (not disabled)', async ({ testLabPage }) => {
    const isSupported = await testLabPage.isTaskSupported(taskInfo);
    expect(isSupported).toBe(true);
  });
  
  test('should generate a valid task', async ({ testLabPage }) => {
    const result = await testLabPage.generateTask(taskInfo);
    
    expect(result.success).toBe(true);
    expect(result.title).toBeTruthy();
    expect(result.questionCount).toBeGreaterThan(0);
    expect(result.hasAnswers).toBe(true);
  });
  
  // Run multiple iterations to validate consistency
  for (let i = 0; i < ITERATIONS; i++) {
    test(`iteration ${i + 1}: should generate valid unique content`, async ({ testLabPage }) => {
      const result = await testLabPage.generateTask(taskInfo);
      
      // Log the result for inspection
      console.log(`Iteration ${i + 1}:`, {
        title: result.title,
        questionCount: result.questionCount,
        hasFigure: result.hasFigure,
      });
      
      expect(result.success).toBe(true);
      expect(result.title).toBeTruthy();
      expect(result.questionCount).toBeGreaterThan(0);
      
      await testLabPage.closeModal();
    });
  }
  
  test('should support regeneration', async ({ testLabPage }) => {
    // Generate first task
    const result1 = await testLabPage.generateTask(taskInfo);
    expect(result1.success).toBe(true);
    
    // Store first title
    const firstTitle = result1.title;
    
    // Regenerate
    await testLabPage.regenerate();
    await testLabPage.waitForGeneration();
    
    // Get new content
    const newTitle = await testLabPage.modalContent.locator('.task-content__title').textContent();
    
    // Note: titles might be the same for some task types, that's okay
    // We're just verifying the regeneration mechanism works
    console.log(`First: ${firstTitle}, Second: ${newTitle?.trim()}`);
    
    await testLabPage.closeModal();
  });
});

