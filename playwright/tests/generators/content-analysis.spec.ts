import { test, expect } from '../fixtures';
import { TASK_TYPES, TaskTypeInfo } from '../../lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Content Analysis Test
 * 
 * Captures detailed content from each generator for quality review.
 * Saves all generated content to a JSON file for analysis.
 */

interface GeneratedContent {
  taskType: TaskTypeInfo;
  iteration: number;
  title: string;
  intro: string;
  questions: Array<{
    text: string;
    answer: string;
    answerType: string;
  }>;
  hasFigure: boolean;
  figureType?: string;
  variables?: Record<string, unknown>;
  timestamp: string;
}

const ITERATIONS_PER_TYPE = 3;
const allContent: GeneratedContent[] = [];

test.describe('Content Analysis', () => {
  test.setTimeout(120000); // 2 minutes per test
  
  for (const taskInfo of TASK_TYPES) {
    test(`Analyze: ${taskInfo.number}. ${taskInfo.name}`, async ({ testLabPage, page }) => {
      await testLabPage.expandCategory(taskInfo.category);
      
      // Check if supported
      const isSupported = await testLabPage.isTaskSupported(taskInfo);
      if (!isSupported) {
        console.log(`⏭️ Skipping ${taskInfo.name}: not supported`);
        return;
      }
      
      for (let i = 0; i < ITERATIONS_PER_TYPE; i++) {
        const result = await testLabPage.generateTask(taskInfo);
        
        if (!result.success) {
          console.log(`❌ ${taskInfo.name} iteration ${i + 1}: ${result.error}`);
          continue;
        }
        
        // Extract detailed content from the modal
        const content: GeneratedContent = {
          taskType: taskInfo,
          iteration: i + 1,
          title: '',
          intro: '',
          questions: [],
          hasFigure: result.hasFigure || false,
          timestamp: new Date().toISOString(),
        };
        
        // Get title
        const titleEl = testLabPage.modalContent.locator('.task-content__title');
        content.title = (await titleEl.textContent())?.trim() || '';
        
        // Get intro text
        const introEl = testLabPage.modalContent.locator('.task-content__intro');
        content.intro = (await introEl.textContent())?.trim() || '';
        
        // Get questions and answers
        const questionEls = await testLabPage.modalContent.locator('.task-question').all();
        for (const qEl of questionEls) {
          const text = (await qEl.locator('.task-question__text').textContent())?.trim() || '';
          const answerPill = qEl.locator('.answer-pill');
          const answer = (await answerPill.locator('.answer-pill__answer').textContent())?.trim() || '';
          const answerType = (await answerPill.locator('.answer-pill__type').textContent())?.trim() || '';
          
          content.questions.push({ text, answer, answerType });
        }
        
        // Get figure type if present
        if (result.hasFigure) {
          const figureEl = testLabPage.modalContent.locator('.task-content__figure');
          if (await figureEl.locator('.voxel-figure').isVisible()) {
            content.figureType = 'voxel';
          } else if (await figureEl.locator('.bar-chart-figure').isVisible()) {
            content.figureType = 'bar_chart';
          } else if (await figureEl.locator('.boxplot-figure').isVisible()) {
            content.figureType = 'boxplot';
          } else if (await figureEl.locator('.task-figure--svg').isVisible()) {
            content.figureType = 'svg';
          }
        }
        
        // Try to get variables from debug section
        if (await testLabPage.debugDetails.isVisible()) {
          try {
            await testLabPage.debugDetails.click();
            const debugText = await testLabPage.debugDetails.locator('pre').textContent();
            if (debugText) {
              content.variables = JSON.parse(debugText);
            }
          } catch {
            // Ignore
          }
        }
        
        allContent.push(content);
        
        // Log the content
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`📋 ${taskInfo.name} #${i + 1}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`Title: ${content.title}`);
        console.log(`Intro: ${content.intro.substring(0, 200)}${content.intro.length > 200 ? '...' : ''}`);
        console.log(`Questions: ${content.questions.length}`);
        for (const q of content.questions) {
          console.log(`  Q: ${q.text}`);
          console.log(`  A: ${q.answer} ${q.answerType}`);
        }
        if (content.hasFigure) {
          console.log(`Figure: ${content.figureType || 'unknown'}`);
        }
        
        await testLabPage.closeModal();
      }
    });
  }
  
  test.afterAll(async () => {
    // Save all content to JSON
    const reportDir = path.join(process.cwd(), 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const reportPath = path.join(reportDir, 'content-analysis.json');
    fs.writeFileSync(reportPath, JSON.stringify(allContent, null, 2));
    console.log(`\n📊 Content saved to: ${reportPath}`);
    console.log(`Total samples: ${allContent.length}`);
  });
});

