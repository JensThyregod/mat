/**
 * Task Generator Types
 * 
 * Base interfaces for the task generation system.
 * Generators can be either logic-based (pure math) or LLM-powered (context-rich).
 */

import type { TaskFigure, AnswerType } from '../types/taskSchema'

// ════════════════════════════════════════════════════════════════
// GENERATOR CONFIGURATION
// ════════════════════════════════════════════════════════════════

export interface GeneratorConfig {
  /** Difficulty override (optional) */
  difficulty?: 'let' | 'middel' | 'svaer'
  
  /** Random seed for reproducibility */
  seed?: number
  
  /** Number of tasks to generate */
  count?: number
}

// ════════════════════════════════════════════════════════════════
// QUESTION STRUCTURE
// ════════════════════════════════════════════════════════════════

export interface GeneratedQuestion {
  text: string
  answer: string
  answer_type: AnswerType
  accept_alternatives?: string[]
  points?: number
}

// ════════════════════════════════════════════════════════════════
// GENERATED TASK (before ID assignment)
// ════════════════════════════════════════════════════════════════

export interface GeneratedTask {
  type: string
  title: string
  intro: string
  figure: TaskFigure
  questions: GeneratedQuestion[]
  variables?: Record<string, string | number>
}

// ════════════════════════════════════════════════════════════════
// GENERATOR INTERFACE
// ════════════════════════════════════════════════════════════════

/**
 * Base interface for all task generators
 */
export interface TaskGenerator {
  /** The task type ID this generator handles */
  readonly taskType: string
  
  /** Human-readable name */
  readonly name: string
  
  /** Whether this generator requires an LLM */
  readonly requiresLLM: boolean
  
  /**
   * Generate a new task
   * @param config Optional configuration
   * @returns A generated task (without ID)
   */
  generate(config?: GeneratorConfig): Promise<GeneratedTask>
}

// ════════════════════════════════════════════════════════════════
// LOGIC-BASED GENERATOR
// ════════════════════════════════════════════════════════════════

/**
 * Abstract base class for logic-based generators
 * These use pure math/randomization to create tasks
 */
export abstract class LogicBasedGenerator implements TaskGenerator {
  abstract readonly taskType: string
  abstract readonly name: string
  readonly requiresLLM = false
  
  abstract generate(config?: GeneratorConfig): Promise<GeneratedTask>
  
  /** Seeded random number generator */
  protected createRng(seed?: number): SeededRandom {
    return new SeededRandom(seed)
  }
}

// ════════════════════════════════════════════════════════════════
// LLM-POWERED GENERATOR
// ════════════════════════════════════════════════════════════════

/**
 * Abstract base class for LLM-powered generators
 * These use OpenAI to generate contextual content
 */
export abstract class LLMGenerator implements TaskGenerator {
  abstract readonly taskType: string
  abstract readonly name: string
  readonly requiresLLM = true
  protected readonly openai: OpenAIService
  
  constructor(openai: OpenAIService) {
    this.openai = openai
  }
  
  abstract generate(config?: GeneratorConfig): Promise<GeneratedTask>
}

// ════════════════════════════════════════════════════════════════
// OPENAI SERVICE INTERFACE
// ════════════════════════════════════════════════════════════════

export interface OpenAIService {
  /**
   * Generate structured output using OpenAI
   * @param systemPrompt The system instructions
   * @param userPrompt The user request
   * @param schema JSON schema for the response
   * @returns Parsed JSON response
   */
  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: OpenAISchema,
    schemaName: string
  ): Promise<T>
}

export interface OpenAISchema {
  type: 'object'
  properties: Record<string, unknown>
  required: string[]
  additionalProperties: boolean
}

// ════════════════════════════════════════════════════════════════
// SEEDED RANDOM NUMBER GENERATOR
// ════════════════════════════════════════════════════════════════

/**
 * Simple seeded random number generator for reproducible task generation
 */
export class SeededRandom {
  private seed: number
  
  constructor(seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 2147483647)
  }
  
  /** Get next random number [0, 1) */
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647
    return (this.seed - 1) / 2147483646
  }
  
  /** Get random integer [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  
  /** Get random integer divisible by step */
  intStep(min: number, max: number, step: number): number {
    const minSteps = Math.ceil(min / step)
    const maxSteps = Math.floor(max / step)
    return this.int(minSteps, maxSteps) * step
  }
  
  /** Pick random element from array */
  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
  
  /** Pick n random elements from array (no duplicates) */
  pickN<T>(array: T[], n: number): T[] {
    const shuffled = this.shuffle([...array])
    return shuffled.slice(0, n)
  }
  
  /** Shuffle array (returns new array) */
  shuffle<T>(array: T[]): T[] {
    const result = [...array]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
  }
  
  /** Random boolean with given probability */
  bool(probability: number = 0.5): boolean {
    return this.next() < probability
  }
}

