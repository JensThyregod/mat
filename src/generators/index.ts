/**
 * Task Generation System
 * 
 * A modular system for procedurally generating math tasks.
 * 
 * ═══════════════════════════════════════════════════════════════
 * QUICK START
 * ═══════════════════════════════════════════════════════════════
 * 
 * ```typescript
 * import { initGenerators, generateTask } from './generators'
 * 
 * // Initialize with OpenAI API key (optional, for LLM-powered tasks)
 * initGenerators('sk-...')
 * 
 * // Generate a logic-based task (no API key needed)
 * const task1 = await generateTask('tal_regnearter')
 * 
 * // Generate an LLM-powered task (requires API key)
 * const task2 = await generateTask('tal_broeker_og_antal')
 * 
 * // Generate with configuration
 * const task3 = await generateTask('geo_vinkelsum', {
 *   difficulty: 'svaer',
 *   seed: 12345  // For reproducibility
 * })
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════
 * SUPPORTED TASK TYPES
 * ═══════════════════════════════════════════════════════════════
 * 
 * LOGIC-BASED (No LLM required):
 * - tal_regnearter        - Basic arithmetic
 * - tal_ligninger         - Simple equations
 * - geo_enhedsomregning   - Unit conversions
 * - geo_vinkelsum         - Triangle angle sum
 * - geo_sammensat_figur   - Composite figures
 * - geo_projektioner      - 3D projections
 * - stat_boksplot         - Boxplot interpretation
 * - stat_sandsynlighed    - Probability
 * - stat_soejlediagram    - Bar chart interpretation
 * 
 * LLM-POWERED (Requires OpenAI API key):
 * - tal_broeker_og_antal      - Fractions in context
 * - tal_forholdstalsregning   - Proportions/recipes
 * - tal_pris_rabat_procent    - Price and discounts
 * 
 * ═══════════════════════════════════════════════════════════════
 */

// Types
export type {
  GeneratorConfig,
  GeneratedTask,
  GeneratedQuestion,
  TaskGenerator,
  OpenAIService,
  OpenAISchema,
} from './types'

export { LogicBasedGenerator, LLMGenerator, SeededRandom } from './types'

// OpenAI Service
export { OpenAI, getOpenAI, initOpenAI, type OpenAIConfig } from './openai'

// Registry
export { GeneratorRegistry, getRegistry, initRegistry } from './registry'

// Logic Generators - Tal og Algebra
export {
  RegneArterGenerator,
  LigningerGenerator,
  RegnehierarkiGenerator,
  HastighedTidGenerator,
  OverslagGenerator,
  AlgebraiskeUdtrykGenerator,
  LineaereFunktionerGenerator,
  PrisRabatGenerator,
  ForholdstalsregningGenerator,
  BroekerGenerator,
} from './logic'

// Logic Generators - Geometri og Måling
export {
  EnhedsomregningGenerator,
  VinkelsumGenerator,
  SammensatFigurGenerator,
  ProjektionerGenerator,
  TrekantElementerGenerator,
  LigedannethedGenerator,
  RumfangGenerator,
  TransformationerGenerator,
} from './logic'

// Logic Generators - Statistik og Sandsynlighed
export {
  BoksplotGenerator,
  SandsynlighedGenerator,
  SoejlediagramGenerator,
  StatistiskeMaalGenerator,
} from './logic'

// Note: LLM generators have been converted to logic-based for reliability
// The llm/ folder is preserved for future use if needed

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

import { initRegistry, getRegistry } from './registry'
import { initOpenAI, getOpenAI } from './openai'
import type { GeneratorConfig, GeneratedTask } from './types'
import type { TaskInstance } from '../types/taskSchema'

let initialized = false

/**
 * Initialize the generator system with optional OpenAI API key
 */
export function initGenerators(apiKey?: string): void {
  if (apiKey) {
    const openai = initOpenAI({ apiKey })
    initRegistry(openai)
  } else {
    initRegistry(undefined)
  }
  initialized = true
}

/**
 * Generate a task by type
 */
export async function generateTask(
  taskType: string,
  config?: GeneratorConfig
): Promise<GeneratedTask> {
  if (!initialized) {
    // Auto-initialize without OpenAI
    initGenerators()
  }
  
  return getRegistry().generate(taskType, config)
}

/**
 * Generate a task instance with ID
 */
export async function generateTaskInstance(
  taskType: string,
  config?: GeneratorConfig
): Promise<TaskInstance> {
  if (!initialized) {
    initGenerators()
  }
  
  return getRegistry().generateTaskInstance(taskType, config)
}

/**
 * Generate multiple tasks of a type
 */
export async function generateBatch(
  taskType: string,
  count: number,
  config?: GeneratorConfig
): Promise<TaskInstance[]> {
  if (!initialized) {
    initGenerators()
  }
  
  return getRegistry().generateBatch(taskType, count, config)
}

/**
 * Get all supported task types
 */
export function getSupportedTypes(): string[] {
  if (!initialized) {
    initGenerators()
  }
  
  return getRegistry().getSupportedTypes()
}

/**
 * Check if a task type can be generated
 */
export function canGenerate(taskType: string): boolean {
  if (!initialized) {
    initGenerators()
  }
  
  return getRegistry().hasGenerator(taskType)
}

/**
 * Check if a task type requires LLM
 */
export function requiresLLM(taskType: string): boolean {
  if (!initialized) {
    initGenerators()
  }
  
  const generator = getRegistry().getGenerator(taskType)
  return generator?.requiresLLM ?? false
}

