import * as fs from 'fs';
import * as path from 'path';
import { ValidationResult, GeneratedTaskResult, TaskTypeInfo } from './types';

/**
 * Reporting utilities for test results
 */

export interface TestReport {
  timestamp: string;
  duration: number;
  summary: {
    totalTypes: number;
    testedTypes: number;
    successfulTypes: number;
    partialTypes: number;
    failedTypes: number;
  };
  categories: {
    algebra: CategoryReport;
    geometri: CategoryReport;
    statistik: CategoryReport;
  };
  details: ValidationResult[];
}

export interface CategoryReport {
  name: string;
  types: number;
  tested: number;
  successful: number;
  failed: number;
  avgTime: number;
}

/**
 * Generate a comprehensive test report
 */
export function generateReport(results: ValidationResult[], startTime: number): TestReport {
  const endTime = Date.now();
  
  const algebraResults = results.filter(r => r.taskType.category === 'algebra');
  const geometriResults = results.filter(r => r.taskType.category === 'geometri');
  const statistikResults = results.filter(r => r.taskType.category === 'statistik');
  
  const categoryReport = (name: string, items: ValidationResult[]): CategoryReport => ({
    name,
    types: items.length,
    tested: items.filter(r => r.iterations > 0).length,
    successful: items.filter(r => r.successCount === r.iterations && r.iterations > 0).length,
    failed: items.filter(r => r.successCount === 0 && r.iterations > 0).length,
    avgTime: items.length > 0 
      ? items.reduce((sum, r) => sum + r.avgGenerationTime, 0) / items.length 
      : 0,
  });
  
  return {
    timestamp: new Date().toISOString(),
    duration: endTime - startTime,
    summary: {
      totalTypes: results.length,
      testedTypes: results.filter(r => r.iterations > 0).length,
      successfulTypes: results.filter(r => r.successCount === r.iterations && r.iterations > 0).length,
      partialTypes: results.filter(r => r.successCount > 0 && r.successCount < r.iterations).length,
      failedTypes: results.filter(r => r.successCount === 0 && r.iterations > 0).length,
    },
    categories: {
      algebra: categoryReport('Tal og Algebra', algebraResults),
      geometri: categoryReport('Geometri og Måling', geometriResults),
      statistik: categoryReport('Statistik og Sandsynlighed', statistikResults),
    },
    details: results,
  };
}

/**
 * Save report to file
 */
export function saveReport(report: TestReport, filename: string = 'test-report.json'): string {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, filename);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  return reportPath;
}

/**
 * Generate a markdown summary of the report
 */
export function generateMarkdownSummary(report: TestReport): string {
  const lines: string[] = [];
  
  lines.push('# Generator Test Report');
  lines.push('');
  lines.push(`**Generated:** ${report.timestamp}`);
  lines.push(`**Duration:** ${(report.duration / 1000).toFixed(1)}s`);
  lines.push('');
  
  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Types | ${report.summary.totalTypes} |`);
  lines.push(`| Tested | ${report.summary.testedTypes} |`);
  lines.push(`| ✅ Successful | ${report.summary.successfulTypes} |`);
  lines.push(`| ⚠️ Partial | ${report.summary.partialTypes} |`);
  lines.push(`| ❌ Failed | ${report.summary.failedTypes} |`);
  lines.push('');
  
  // Categories
  lines.push('## By Category');
  lines.push('');
  
  for (const [key, cat] of Object.entries(report.categories)) {
    lines.push(`### ${cat.name}`);
    lines.push('');
    lines.push(`- Types: ${cat.types}`);
    lines.push(`- Tested: ${cat.tested}`);
    lines.push(`- Successful: ${cat.successful}`);
    lines.push(`- Failed: ${cat.failed}`);
    lines.push(`- Avg Time: ${Math.round(cat.avgTime)}ms`);
    lines.push('');
  }
  
  // Details
  lines.push('## Details');
  lines.push('');
  lines.push('| # | Type | Success | Time | Errors |');
  lines.push('|---|------|---------|------|--------|');
  
  for (const result of report.details) {
    const status = result.successCount === result.iterations 
      ? '✅' 
      : result.successCount > 0 
        ? '⚠️' 
        : result.iterations > 0 
          ? '❌' 
          : '⏭️';
    
    const errors = result.errors.length > 0 
      ? [...new Set(result.errors)].slice(0, 2).join(', ') 
      : '-';
    
    lines.push(`| ${result.taskType.number} | ${result.taskType.name} | ${status} ${result.successCount}/${result.iterations} | ${Math.round(result.avgGenerationTime)}ms | ${errors} |`);
  }
  
  return lines.join('\n');
}

/**
 * Save markdown report
 */
export function saveMarkdownReport(report: TestReport, filename: string = 'test-report.md'): string {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const markdown = generateMarkdownSummary(report);
  const reportPath = path.join(reportDir, filename);
  fs.writeFileSync(reportPath, markdown);
  
  return reportPath;
}

/**
 * Print report to console
 */
export function printReport(report: TestReport): void {
  console.log('\n' + '═'.repeat(60));
  console.log('GENERATOR TEST REPORT');
  console.log('═'.repeat(60));
  console.log(`Time: ${report.timestamp}`);
  console.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);
  console.log('');
  
  console.log('SUMMARY:');
  console.log(`  Total: ${report.summary.totalTypes} types`);
  console.log(`  Tested: ${report.summary.testedTypes}`);
  console.log(`  ✅ Successful: ${report.summary.successfulTypes}`);
  console.log(`  ⚠️ Partial: ${report.summary.partialTypes}`);
  console.log(`  ❌ Failed: ${report.summary.failedTypes}`);
  console.log('');
  
  console.log('BY CATEGORY:');
  for (const [_, cat] of Object.entries(report.categories)) {
    console.log(`  ${cat.name}: ${cat.successful}/${cat.tested} successful (${Math.round(cat.avgTime)}ms avg)`);
  }
  
  console.log('═'.repeat(60));
}

