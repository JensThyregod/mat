import { Page, Locator, expect } from '@playwright/test';
import { TaskTypeInfo, TASK_TYPES } from '../types';

/**
 * Page Object Model for the Generator Test Lab
 * 
 * Provides methods to interact with the test lab UI
 * for testing task generators.
 */
export class TestLabPage {
  readonly page: Page;
  
  // Main elements
  readonly hero: Locator;
  readonly searchInput: Locator;
  readonly categoryHeaders: Locator;
  readonly taskCards: Locator;
  
  // Modal elements
  readonly modal: Locator;
  readonly modalCloseButton: Locator;
  readonly modalLoading: Locator;
  readonly modalError: Locator;
  readonly modalContent: Locator;
  readonly regenerateButton: Locator;
  readonly debugDetails: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Main elements
    this.hero = page.locator('.testlab__hero');
    this.searchInput = page.locator('.testlab__search-input');
    this.categoryHeaders = page.locator('.testlab__category-header');
    this.taskCards = page.locator('.testlab__card');
    
    // Modal elements
    this.modal = page.locator('.testlab__modal');
    this.modalCloseButton = page.locator('.testlab__modal-close');
    this.modalLoading = page.locator('.testlab__modal-loading');
    this.modalError = page.locator('.testlab__modal-error');
    this.modalContent = page.locator('.testlab__modal-content');
    this.regenerateButton = page.locator('button:has-text("Ny opgave")');
    this.debugDetails = page.locator('.testlab__modal-debug');
  }
  
  /**
   * Navigate to the Test Lab page
   */
  async goto(): Promise<void> {
    await this.page.goto('/test-lab');
    await this.hero.waitFor({ state: 'visible' });
  }
  
  /**
   * Search for a task type
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }
  
  /**
   * Clear search
   */
  async clearSearch(): Promise<void> {
    await this.page.locator('.testlab__search-clear').click();
  }
  
  /**
   * Expand a category by name
   */
  async expandCategory(category: 'algebra' | 'geometri' | 'statistik'): Promise<void> {
    const categoryMap = {
      algebra: 'Tal og Algebra',
      geometri: 'Geometri og Måling',
      statistik: 'Statistik og Sandsynlighed',
    };
    
    const header = this.page.locator(`.testlab__category-header:has-text("${categoryMap[category]}")`);
    const parent = header.locator('..');
    
    // Check if already expanded
    const isExpanded = await parent.evaluate(el => el.classList.contains('expanded'));
    if (!isExpanded) {
      await header.click();
    }
  }
  
  /**
   * Get a task card by its number
   */
  getTaskCardByNumber(number: number): Locator {
    return this.page.locator(`.testlab__card:has(.testlab__card-number:text-is("${number}"))`);
  }
  
  /**
   * Get a task card by its ID
   */
  getTaskCardById(id: string): Locator {
    // Find by task number since that's what's visible in the UI
    const taskInfo = TASK_TYPES.find(t => t.id === id);
    if (!taskInfo) {
      throw new Error(`Unknown task type: ${id}`);
    }
    return this.getTaskCardByNumber(taskInfo.number);
  }
  
  /**
   * Click on a task card to generate a task
   */
  async clickTaskCard(taskInfo: TaskTypeInfo): Promise<void> {
    const card = this.getTaskCardByNumber(taskInfo.number);
    await card.click();
  }
  
  /**
   * Wait for the modal to show generated content
   */
  async waitForGeneration(): Promise<'success' | 'error'> {
    // Wait for modal to appear
    await this.modal.waitFor({ state: 'visible' });
    
    // Wait for either content or error
    try {
      await Promise.race([
        this.modalContent.waitFor({ state: 'visible', timeout: 30000 }),
        this.modalError.waitFor({ state: 'visible', timeout: 30000 }),
      ]);
      
      // Check which one appeared
      if (await this.modalError.isVisible()) {
        return 'error';
      }
      return 'success';
    } catch {
      // Check loading state
      if (await this.modalLoading.isVisible()) {
        throw new Error('Generation timed out while still loading');
      }
      throw new Error('Generation failed with unknown state');
    }
  }
  
  /**
   * Generate a task and return the result
   */
  async generateTask(taskInfo: TaskTypeInfo): Promise<{
    success: boolean;
    title?: string;
    questionCount?: number;
    hasAnswers?: boolean;
    hasFigure?: boolean;
    error?: string;
    variables?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    
    // Expand the category first
    await this.expandCategory(taskInfo.category);
    
    // Click the task card
    await this.clickTaskCard(taskInfo);
    
    // Wait for generation
    const result = await this.waitForGeneration();
    
    if (result === 'error') {
      const errorText = await this.modalError.locator('p').textContent();
      await this.closeModal();
      return {
        success: false,
        error: errorText || 'Unknown error',
      };
    }
    
    // Extract information from the generated task
    const title = await this.modalContent.locator('.task-content__title').textContent();
    const questions = await this.modalContent.locator('.task-question').count();
    const answers = await this.modalContent.locator('.answer-pill').count();
    const hasFigure = await this.modalContent.locator('.task-figure, .voxel-figure, .bar-chart-figure, .boxplot-figure').count() > 0;
    
    // Try to get debug variables
    let variables: Record<string, unknown> | undefined;
    if (await this.debugDetails.isVisible()) {
      await this.debugDetails.click();
      const debugText = await this.debugDetails.locator('pre').textContent();
      if (debugText) {
        try {
          variables = JSON.parse(debugText);
        } catch {
          // Ignore parse errors
        }
      }
    }
    
    return {
      success: true,
      title: title?.trim() || undefined,
      questionCount: questions,
      hasAnswers: answers > 0,
      hasFigure,
      variables,
    };
  }
  
  /**
   * Regenerate the current task (click "Ny opgave")
   */
  async regenerate(): Promise<void> {
    await this.regenerateButton.click();
  }
  
  /**
   * Close the modal
   */
  async closeModal(): Promise<void> {
    if (await this.modal.isVisible()) {
      await this.modalCloseButton.click();
      await this.modal.waitFor({ state: 'hidden' });
    }
  }
  
  /**
   * Check if a task type is supported (not disabled)
   */
  async isTaskSupported(taskInfo: TaskTypeInfo): Promise<boolean> {
    const card = this.getTaskCardByNumber(taskInfo.number);
    const isDisabled = await card.evaluate(el => el.classList.contains('disabled'));
    return !isDisabled;
  }
  
  /**
   * Check if a task type uses AI (LLM)
   */
  async isTaskAIPowered(taskInfo: TaskTypeInfo): Promise<boolean> {
    const card = this.getTaskCardByNumber(taskInfo.number);
    const badge = card.locator('.testlab__badge--ai');
    return await badge.isVisible();
  }
  
  /**
   * Get all visible task cards info
   */
  async getVisibleTaskCards(): Promise<{ number: number; enabled: boolean; isAI: boolean }[]> {
    const cards = await this.taskCards.all();
    const results: { number: number; enabled: boolean; isAI: boolean }[] = [];
    
    for (const card of cards) {
      const numberText = await card.locator('.testlab__card-number').textContent();
      const number = parseInt(numberText || '0', 10);
      const isDisabled = await card.evaluate(el => el.classList.contains('disabled'));
      const isAI = await card.locator('.testlab__badge--ai').isVisible();
      
      results.push({
        number,
        enabled: !isDisabled,
        isAI,
      });
    }
    
    return results;
  }
  
  /**
   * Take a screenshot of the current state
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
  }
}

