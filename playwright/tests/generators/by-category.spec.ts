import { test, expect } from '../fixtures';
import { TASK_TYPES } from '../../lib';

/**
 * Test generators by category
 * 
 * This file provides focused testing for each category of tasks:
 * - Algebra (tal_*)
 * - Geometri (geo_*)
 * - Statistik (stat_*)
 */

const algebraTypes = TASK_TYPES.filter(t => t.category === 'algebra');
const geometriTypes = TASK_TYPES.filter(t => t.category === 'geometri');
const statistikTypes = TASK_TYPES.filter(t => t.category === 'statistik');

test.describe('Algebra Generators (Tal og Algebra)', () => {
  for (const taskInfo of algebraTypes) {
    test(`${taskInfo.number}. ${taskInfo.name}: should generate successfully`, async ({ testLabPage }) => {
      await testLabPage.expandCategory('algebra');
      
      const isSupported = await testLabPage.isTaskSupported(taskInfo);
      if (!isSupported) {
        test.skip();
        return;
      }
      
      const isAI = await testLabPage.isTaskAIPowered(taskInfo);
      if (isAI) {
        console.log(`⚠️ ${taskInfo.name} requires AI - skipping in automated test`);
        test.skip();
        return;
      }
      
      const result = await testLabPage.generateTask(taskInfo);
      
      expect(result.success).toBe(true);
      expect(result.title).toBeTruthy();
      expect(result.questionCount).toBeGreaterThan(0);
      
      console.log(`✅ ${taskInfo.name}: ${result.questionCount} questions, figure: ${result.hasFigure}`);
    });
  }
});

test.describe('Geometri Generators (Geometri og Måling)', () => {
  for (const taskInfo of geometriTypes) {
    test(`${taskInfo.number}. ${taskInfo.name}: should generate successfully`, async ({ testLabPage }) => {
      await testLabPage.expandCategory('geometri');
      
      const isSupported = await testLabPage.isTaskSupported(taskInfo);
      if (!isSupported) {
        test.skip();
        return;
      }
      
      const isAI = await testLabPage.isTaskAIPowered(taskInfo);
      if (isAI) {
        console.log(`⚠️ ${taskInfo.name} requires AI - skipping in automated test`);
        test.skip();
        return;
      }
      
      const result = await testLabPage.generateTask(taskInfo);
      
      expect(result.success).toBe(true);
      expect(result.title).toBeTruthy();
      expect(result.questionCount).toBeGreaterThan(0);
      
      // Geometry tasks often have figures
      console.log(`✅ ${taskInfo.name}: ${result.questionCount} questions, figure: ${result.hasFigure}`);
    });
  }
});

test.describe('Statistik Generators (Statistik og Sandsynlighed)', () => {
  for (const taskInfo of statistikTypes) {
    test(`${taskInfo.number}. ${taskInfo.name}: should generate successfully`, async ({ testLabPage }) => {
      await testLabPage.expandCategory('statistik');
      
      const isSupported = await testLabPage.isTaskSupported(taskInfo);
      if (!isSupported) {
        test.skip();
        return;
      }
      
      const isAI = await testLabPage.isTaskAIPowered(taskInfo);
      if (isAI) {
        console.log(`⚠️ ${taskInfo.name} requires AI - skipping in automated test`);
        test.skip();
        return;
      }
      
      const result = await testLabPage.generateTask(taskInfo);
      
      expect(result.success).toBe(true);
      expect(result.title).toBeTruthy();
      expect(result.questionCount).toBeGreaterThan(0);
      
      // Statistik tasks usually have figures (charts, boxplots)
      console.log(`✅ ${taskInfo.name}: ${result.questionCount} questions, figure: ${result.hasFigure}`);
    });
  }
});

