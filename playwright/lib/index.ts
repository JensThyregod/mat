/**
 * Main exports for the playwright test library
 */

// Auth helpers
export { loginAsTestUser, quickLoginAsTestUser, goToTestLab, setupTestLab, TEST_USER } from './auth';
export type { TestUser } from './auth';

// Types
export { TASK_TYPES } from './types';
export type { TaskTypeInfo, GeneratedTaskResult, ValidationResult } from './types';

// Page Objects
export { TestLabPage } from './pages/TestLabPage';

// Reporting
export { 
  generateReport, 
  saveReport, 
  generateMarkdownSummary, 
  saveMarkdownReport, 
  printReport 
} from './reporting';
export type { TestReport, CategoryReport } from './reporting';

