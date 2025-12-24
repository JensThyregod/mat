// ============================================
// YAML TASK PARSER
// Loads and validates YAML task files
// ============================================

import yaml from 'js-yaml'
import type {
  TaskInstance,
  TaskTypeDefinition,
  TaskFigure,
  Question,
  ParsedTaskInstance,
} from '../types/taskSchema'
import { renderLatexToHtml } from './latexRenderer'

// ============================================
// YAML LOADING
// ============================================

/**
 * Parse a YAML string into a TaskInstance
 */
export function parseTaskYaml(yamlContent: string): TaskInstance {
  const parsed = yaml.load(yamlContent) as TaskInstance
  validateTaskInstance(parsed)
  return parsed
}

/**
 * Parse a YAML string into a TaskTypeDefinition
 */
export function parseTaskTypeYaml(yamlContent: string): TaskTypeDefinition {
  const parsed = yaml.load(yamlContent) as TaskTypeDefinition
  validateTaskTypeDefinition(parsed)
  return parsed
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validates a TaskInstance has required fields
 */
function validateTaskInstance(task: unknown): asserts task is TaskInstance {
  if (!task || typeof task !== 'object') {
    throw new Error('Task must be an object')
  }
  
  const t = task as Record<string, unknown>
  
  if (typeof t.id !== 'string' || !t.id) {
    throw new Error('Task must have a string id')
  }
  
  if (typeof t.type !== 'string' || !t.type) {
    throw new Error('Task must have a string type')
  }
  
  if (typeof t.title !== 'string' || !t.title) {
    throw new Error('Task must have a string title')
  }
  
  if (typeof t.intro !== 'string') {
    throw new Error('Task must have a string intro')
  }
  
  if (!Array.isArray(t.questions) || t.questions.length === 0) {
    throw new Error('Task must have at least one question')
  }
  
  for (let i = 0; i < t.questions.length; i++) {
    validateQuestion(t.questions[i], i)
  }
  
  // Validate figure if present
  if (t.figure !== null && t.figure !== undefined) {
    validateFigure(t.figure)
  }
}

/**
 * Validates a Question object
 */
function validateQuestion(q: unknown, index: number): asserts q is Question {
  if (!q || typeof q !== 'object') {
    throw new Error(`Question ${index} must be an object`)
  }
  
  const question = q as Record<string, unknown>
  
  if (typeof question.text !== 'string' || !question.text) {
    throw new Error(`Question ${index} must have a string text`)
  }
  
  if (typeof question.answer !== 'string') {
    throw new Error(`Question ${index} must have a string answer`)
  }
  
  if (typeof question.answer_type !== 'string') {
    throw new Error(`Question ${index} must have an answer_type`)
  }
}

/**
 * Validates a TaskFigure object
 */
function validateFigure(figure: unknown): asserts figure is TaskFigure {
  if (!figure || typeof figure !== 'object') {
    throw new Error('Figure must be an object')
  }
  
  const f = figure as Record<string, unknown>
  
  if (typeof f.type !== 'string') {
    throw new Error('Figure must have a type')
  }
  
  // Type-specific validation could be added here
  const validTypes = [
    'triangle', 'polygon', 'voxel', 'svg', 'image',
    'bar_chart', 'boxplot', 'rectangles', 'triangles',
    'transformations', 'intersecting_lines'
  ]
  
  if (!validTypes.includes(f.type)) {
    throw new Error(`Unknown figure type: ${f.type}`)
  }
}

/**
 * Validates a TaskTypeDefinition has required fields
 */
function validateTaskTypeDefinition(taskType: unknown): asserts taskType is TaskTypeDefinition {
  if (!taskType || typeof taskType !== 'object') {
    throw new Error('TaskType must be an object')
  }
  
  const t = taskType as Record<string, unknown>
  
  const requiredFields = ['id', 'name', 'category', 'subcategory', 'level', 'exam_part', 'difficulty', 'description']
  
  for (const field of requiredFields) {
    if (typeof t[field] !== 'string' || !t[field]) {
      throw new Error(`TaskType must have a string ${field}`)
    }
  }
  
  if (!t.allowed_tools || typeof t.allowed_tools !== 'object') {
    throw new Error('TaskType must have allowed_tools object')
  }
}

// ============================================
// PARSING TO RUNTIME FORMAT
// ============================================

/**
 * Convert a TaskInstance to a ParsedTaskInstance with rendered HTML
 */
export function parseTaskToRuntime(task: TaskInstance): ParsedTaskInstance {
  return {
    id: task.id,
    type: task.type,
    title: task.title,
    introHtml: renderLatexToHtml(task.intro),
    figure: task.figure,
    questions: task.questions.map((q, index) => ({
      index,
      text: q.text,
      textHtml: renderLatexToHtml(q.text),
      answer: q.answer,
      answerType: q.answer_type,
      acceptAlternatives: q.accept_alternatives ?? [],
    })),
  }
}

// ============================================
// BATCH LOADING
// ============================================

/**
 * Parse multiple task YAML strings
 */
export function parseMultipleTasks(yamlContents: string[]): TaskInstance[] {
  return yamlContents.map(parseTaskYaml)
}

/**
 * Parse multiple task type YAML strings
 */
export function parseMultipleTaskTypes(yamlContents: string[]): TaskTypeDefinition[] {
  return yamlContents.map(parseTaskTypeYaml)
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract task type ID from a task instance filename
 * e.g., "tal_broeker_001.yaml" -> "tal_broeker"
 */
export function extractTypeFromFilename(filename: string): string {
  const base = filename.replace(/\.ya?ml$/i, '')
  const parts = base.split('_')
  // Remove the last numeric part (instance number)
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    parts.pop()
  }
  return parts.join('_')
}

/**
 * Extract instance number from a task filename
 * e.g., "tal_broeker_001.yaml" -> 1
 */
export function extractInstanceNumber(filename: string): number {
  const base = filename.replace(/\.ya?ml$/i, '')
  const match = base.match(/_(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

/**
 * Generate a task ID from type and instance number
 * e.g., ("tal_broeker", 1) -> "tal_broeker_001"
 */
export function generateTaskId(typeId: string, instanceNumber: number): string {
  return `${typeId}_${String(instanceNumber).padStart(3, '0')}`
}

