import { test, expect } from '../fixtures';
import { TASK_TYPES } from '../../lib';

/**
 * Quick Check Test
 * 
 * Rapidly validates that each generator type can produce at least one task.
 * Use this for fast CI validation.
 */

test.describe('Quick Generator Check', () => {
  // Get all supported types (we'll check in the test)
  const types = TASK_TYPES;
  
  test('should load the test lab successfully', async ({ testLabPage }) => {
    await expect(testLabPage.hero).toBeVisible();
    await expect(testLabPage.searchInput).toBeVisible();
  });
  
  test('should display all categories', async ({ testLabPage }) => {
    const categories = await testLabPage.categoryHeaders.count();
    expect(categories).toBe(3); // algebra, geometri, statistik
  });
  
  test('should have visible task cards', async ({ testLabPage }) => {
    // Expand all categories
    await testLabPage.expandCategory('algebra');
    await testLabPage.expandCategory('geometri');
    await testLabPage.expandCategory('statistik');
    
    const visibleCards = await testLabPage.getVisibleTaskCards();
    expect(visibleCards.length).toBe(22); // All 22 task types
    
    // Log status
    const enabled = visibleCards.filter(c => c.enabled).length;
    const aiPowered = visibleCards.filter(c => c.isAI).length;
    console.log(`\n📊 Task Status:`);
    console.log(`   Total: ${visibleCards.length}`);
    console.log(`   Enabled: ${enabled}`);
    console.log(`   AI-powered: ${aiPowered}`);
    console.log(`   Logic-based: ${enabled - aiPowered}`);
  });
  
  // Quick test each logic-based generator (skip AI for speed)
  test.describe('Logic-based generators', () => {
    test('should successfully generate each logic-based type once', async ({ testLabPage }) => {
      const results: { name: string; success: boolean; time: number }[] = [];
      
      for (const taskInfo of types) {
        // Expand category
        await testLabPage.expandCategory(taskInfo.category);
        
        // Check if supported and not AI
        const isSupported = await testLabPage.isTaskSupported(taskInfo);
        const isAI = await testLabPage.isTaskAIPowered(taskInfo);
        
        if (!isSupported || isAI) {
          console.log(`⏭️ Skip: ${taskInfo.name} (${!isSupported ? 'not supported' : 'AI-powered'})`);
          continue;
        }
        
        // Generate
        const startTime = Date.now();
        const result = await testLabPage.generateTask(taskInfo);
        const endTime = Date.now();
        
        results.push({
          name: taskInfo.name,
          success: result.success,
          time: endTime - startTime,
        });
        
        if (result.success) {
          console.log(`✅ ${taskInfo.name}: ${endTime - startTime}ms`);
        } else {
          console.log(`❌ ${taskInfo.name}: ${result.error}`);
        }
        
        await testLabPage.closeModal();
      }
      
      // Summary
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      
      console.log(`\n📊 Results: ${successful}/${results.length} passed (avg ${Math.round(avgTime)}ms)`);
      
      // All tested generators should succeed
      expect(failed).toBe(0);
    });
  });
});

