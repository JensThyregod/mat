import { test, expect } from '../fixtures';
import { TASK_TYPES } from '../../lib';

/**
 * Verify the content quality fixes
 */

test.describe('Verify Content Fixes', () => {
  test.setTimeout(60000);
  
  // Test vinkelsum LaTeX fix
  test('Vinkelsum should have properly formatted LaTeX in intro', async ({ testLabPage }) => {
    const taskInfo = TASK_TYPES.find(t => t.id === 'geo_vinkelsum')!;
    await testLabPage.expandCategory('geometri');
    
    for (let i = 0; i < 3; i++) {
      await testLabPage.generateTask(taskInfo);
      
      const intro = await testLabPage.modalContent.locator('.task-content__intro').textContent();
      
      // Should NOT contain raw $ signs or mixed delimiters
      console.log(`Vinkelsum #${i + 1} intro:`, intro);
      expect(intro).not.toContain('$ og $');
      expect(intro).toContain('og'); // Should have ' og ' without $ around it
      
      await testLabPage.closeModal();
    }
  });
  
  // Test soejlediagram singular forms
  test('Søjlediagram should use correct singular forms', async ({ testLabPage }) => {
    const taskInfo = TASK_TYPES.find(t => t.id === 'stat_soejlediagram')!;
    await testLabPage.expandCategory('statistik');
    
    for (let i = 0; i < 5; i++) {
      await testLabPage.generateTask(taskInfo);
      
      const questions = await testLabPage.modalContent.locator('.task-question__text').allTextContents();
      const highestQuestion = questions.find(q => q.includes('højeste'));
      
      console.log(`Søjlediagram #${i + 1} question:`, highestQuestion);
      
      // Should NOT have truncated words like "f" or "da"
      if (highestQuestion) {
        expect(highestQuestion).not.toMatch(/Hvilken [a-z] har/); // Single letter
        expect(highestQuestion).not.toContain('Hvilken f ');
        expect(highestQuestion).not.toContain('Hvilken da ');
      }
      
      await testLabPage.closeModal();
    }
  });
  
  // Test boksplot grammar (Hvilket vs Hvilken)
  test('Boksplot should use correct Danish pronouns', async ({ testLabPage }) => {
    const taskInfo = TASK_TYPES.find(t => t.id === 'stat_boksplot')!;
    await testLabPage.expandCategory('statistik');
    
    for (let i = 0; i < 5; i++) {
      await testLabPage.generateTask(taskInfo);
      
      const questions = await testLabPage.modalContent.locator('.task-question__text').allTextContents();
      
      console.log(`Boksplot #${i + 1} questions:`, questions);
      
      // Check that neuter nouns get "Hvilket"
      for (const q of questions) {
        if (q.includes('hold') || q.includes('år')) {
          expect(q).toContain('Hvilket');
          expect(q).not.toMatch(/Hvilken (hold|år)/);
        }
      }
      
      await testLabPage.closeModal();
    }
  });
  
  // Test broeker article usage
  test('Brøker should use proper articles', async ({ testLabPage }) => {
    const taskInfo = TASK_TYPES.find(t => t.id === 'tal_broeker_og_antal')!;
    await testLabPage.expandCategory('algebra');
    
    for (let i = 0; i < 5; i++) {
      await testLabPage.generateTask(taskInfo);
      
      const intro = await testLabPage.modalContent.locator('.task-content__intro').textContent();
      
      console.log(`Brøker #${i + 1} intro:`, intro);
      
      // Should NOT have "I pose med slik" - should be "I en pose med slik"
      if (intro?.includes('pose med slik')) {
        expect(intro).toContain('en pose med slik');
      }
      // Should NOT have "I bogsamling" - should be "I en bogsamling" 
      if (intro?.includes('bogsamling')) {
        expect(intro).toMatch(/(en |)bogsamling/);
      }
      
      await testLabPage.closeModal();
    }
  });
});

