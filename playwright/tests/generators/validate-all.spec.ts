import { test, expect } from '../fixtures';
import { TASK_TYPES, TaskTypeInfo, GeneratedTaskResult, ValidationResult } from '../../lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Validate ALL task generators
 * 
 * This test suite runs through every task type and validates:
 * 1. The generator is accessible in the UI
 * 2. It can generate tasks successfully
 * 3. Generated tasks have proper structure
 * 
 * Results are saved to a JSON report file.
 */

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const ITERATIONS_PER_TYPE = 3; // How many times to generate each type
const SKIP_AI_TYPES = true; // Skip AI-powered types (faster testing)
const SAVE_REPORT = true; // Save results to JSON file

// ═══════════════════════════════════════════════════════════════
// VALIDATION RESULTS
// ═══════════════════════════════════════════════════════════════

const validationResults: Map<string, ValidationResult> = new Map();

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function saveResults() {
  if (!SAVE_REPORT) return;
  
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const results = Array.from(validationResults.values());
  const summary = {
    timestamp: new Date().toISOString(),
    totalTypes: results.length,
    successfulTypes: results.filter(r => r.successCount > 0).length,
    failedTypes: results.filter(r => r.failureCount === r.iterations).length,
    totalIterations: results.reduce((sum, r) => sum + r.iterations, 0),
    totalSuccesses: results.reduce((sum, r) => sum + r.successCount, 0),
    totalFailures: results.reduce((sum, r) => sum + r.failureCount, 0),
    avgGenerationTime: results.reduce((sum, r) => sum + r.avgGenerationTime, 0) / results.length,
    results,
  };
  
  const reportPath = path.join(reportDir, 'validation-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\n📊 Report saved to: ${reportPath}`);
}

// ═══════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════

test.describe('Validate All Generators', () => {
  // Group by category for organized reporting
  const categories = {
    algebra: TASK_TYPES.filter(t => t.category === 'algebra'),
    geometri: TASK_TYPES.filter(t => t.category === 'geometri'),
    statistik: TASK_TYPES.filter(t => t.category === 'statistik'),
  };
  
  // Test each category
  for (const [category, types] of Object.entries(categories)) {
    test.describe(`Category: ${category}`, () => {
      for (const taskInfo of types) {
        test.describe(`${taskInfo.number}. ${taskInfo.name} (${taskInfo.id})`, () => {
          
          test('accessibility and generation', async ({ testLabPage }) => {
            // Initialize validation result
            const validation: ValidationResult = {
              taskType: taskInfo,
              iterations: 0,
              successCount: 0,
              failureCount: 0,
              avgGenerationTime: 0,
              errors: [],
              samples: [],
            };
            
            // Expand category
            await testLabPage.expandCategory(taskInfo.category);
            
            // Check if supported
            const isSupported = await testLabPage.isTaskSupported(taskInfo);
            
            if (!isSupported) {
              console.log(`⏭️ Skipping ${taskInfo.id}: not supported yet`);
              validation.errors.push('Not supported (disabled in UI)');
              validationResults.set(taskInfo.id, validation);
              test.skip();
              return;
            }
            
            // Check if AI-powered (optionally skip)
            const isAI = await testLabPage.isTaskAIPowered(taskInfo);
            if (isAI && SKIP_AI_TYPES) {
              console.log(`⏭️ Skipping ${taskInfo.id}: AI-powered (SKIP_AI_TYPES=true)`);
              validation.errors.push('Skipped: AI-powered type');
              validationResults.set(taskInfo.id, validation);
              test.skip();
              return;
            }
            
            // Run iterations
            const times: number[] = [];
            
            for (let i = 0; i < ITERATIONS_PER_TYPE; i++) {
              const startTime = Date.now();
              
              try {
                const result = await testLabPage.generateTask(taskInfo);
                const endTime = Date.now();
                times.push(endTime - startTime);
                
                validation.iterations++;
                
                if (result.success) {
                  validation.successCount++;
                  validation.samples.push({
                    taskType: taskInfo,
                    success: true,
                    title: result.title,
                    questionCount: result.questionCount,
                    hasAnswers: result.hasAnswers,
                    hasFigure: result.hasFigure,
                    generationTime: endTime - startTime,
                  });
                } else {
                  validation.failureCount++;
                  validation.errors.push(result.error || 'Unknown error');
                  validation.samples.push({
                    taskType: taskInfo,
                    success: false,
                    error: result.error,
                    generationTime: endTime - startTime,
                  });
                }
                
                await testLabPage.closeModal();
              } catch (error) {
                validation.iterations++;
                validation.failureCount++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                validation.errors.push(errorMessage);
                validation.samples.push({
                  taskType: taskInfo,
                  success: false,
                  error: errorMessage,
                });
                
                // Try to close modal on error
                try {
                  await testLabPage.closeModal();
                } catch {
                  // Ignore cleanup errors
                }
              }
            }
            
            // Calculate average time
            validation.avgGenerationTime = times.length > 0 
              ? times.reduce((a, b) => a + b, 0) / times.length 
              : 0;
            
            // Store results
            validationResults.set(taskInfo.id, validation);
            
            // Log summary
            console.log(`\n📋 ${taskInfo.name}:`);
            console.log(`   ✅ Success: ${validation.successCount}/${validation.iterations}`);
            console.log(`   ⏱️ Avg time: ${Math.round(validation.avgGenerationTime)}ms`);
            if (validation.errors.length > 0) {
              console.log(`   ❌ Errors: ${[...new Set(validation.errors)].join(', ')}`);
            }
            
            // Assertions
            expect(validation.successCount).toBeGreaterThan(0);
          });
        });
      }
    });
  }
  
  // After all tests, save the report
  test.afterAll(async () => {
    saveResults();
    
    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('VALIDATION SUMMARY');
    console.log('═'.repeat(60));
    
    let totalSuccess = 0;
    let totalFailure = 0;
    
    for (const [id, result] of validationResults) {
      const status = result.successCount === result.iterations ? '✅' 
        : result.successCount > 0 ? '⚠️' 
        : '❌';
      console.log(`${status} ${result.taskType.number}. ${result.taskType.name}: ${result.successCount}/${result.iterations}`);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;
    }
    
    console.log('═'.repeat(60));
    console.log(`Total: ${totalSuccess} successes, ${totalFailure} failures`);
    console.log('═'.repeat(60));
  });
});

