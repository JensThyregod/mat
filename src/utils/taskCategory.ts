// ============================================
// Task Category Utilities
// Determine the main topic/category based on task number
// ============================================

export type TaskCategory = 'algebra' | 'geometri' | 'statistik'

export interface CategoryInfo {
  id: TaskCategory
  name: string
  shortName: string
  cssClass: string
}

export const CATEGORIES: Record<TaskCategory, CategoryInfo> = {
  algebra: {
    id: 'algebra',
    name: 'Tal og algebra',
    shortName: 'Algebra',
    cssClass: 'cat-algebra',
  },
  geometri: {
    id: 'geometri',
    name: 'Geometri og måling',
    shortName: 'Geometri',
    cssClass: 'cat-geometri',
  },
  statistik: {
    id: 'statistik',
    name: 'Statistik og sandsynlighed',
    shortName: 'Statistik',
    cssClass: 'cat-statistik',
  },
}

/**
 * Extract the task number from a task title like "Opgave 1: Brøker"
 */
export function extractTaskNumber(title: string): number | null {
  // Match patterns like "Opgave 1:", "Opgave 12:", etc.
  const match = title.match(/Opgave\s*(\d+)/i)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

/**
 * Determine the category based on task number
 * FP9 structure:
 * - Opgave 1-10:  Tal og algebra
 * - Opgave 11-17: Geometri og måling
 * - Opgave 18-20: Statistik og sandsynlighed
 */
export function getCategoryByTaskNumber(taskNumber: number): CategoryInfo {
  if (taskNumber >= 1 && taskNumber <= 10) {
    return CATEGORIES.algebra
  }
  if (taskNumber >= 11 && taskNumber <= 17) {
    return CATEGORIES.geometri
  }
  if (taskNumber >= 18 && taskNumber <= 20) {
    return CATEGORIES.statistik
  }
  // Default to algebra for unknown
  return CATEGORIES.algebra
}

/**
 * Get category info from a part's title
 */
export function getCategoryFromTitle(title: string): CategoryInfo {
  const taskNumber = extractTaskNumber(title)
  if (taskNumber !== null) {
    return getCategoryByTaskNumber(taskNumber)
  }
  return CATEGORIES.algebra
}

/**
 * Get category for a specific part index (0-based)
 * Assumes standard FP9 structure with 20 parts
 */
export function getCategoryByPartIndex(partIndex: number): CategoryInfo {
  // Part index is 0-based, task numbers are 1-based
  const taskNumber = partIndex + 1
  return getCategoryByTaskNumber(taskNumber)
}





