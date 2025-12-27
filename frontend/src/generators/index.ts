/**
 * Task Generation System
 * 
 * A modular system for procedurally generating math tasks.
 * All 22 generators are logic-based (no LLM/API required).
 * 
 * ═══════════════════════════════════════════════════════════════
 * QUICK START
 * ═══════════════════════════════════════════════════════════════
 * 
 * ```typescript
 * import { initGenerators, generateTask } from './generators'
 * 
 * // Initialize the generator system
 * initGenerators()
 * 
 * // Generate a task
 * const task1 = await generateTask('tal_regnearter')
 * 
 * // Generate with configuration
 * const task2 = await generateTask('geo_vinkelsum', {
 *   difficulty: 'svaer',
 *   seed: 12345  // For reproducibility
 * })
 * ```
 * 
 * ═══════════════════════════════════════════════════════════════
 * SUPPORTED TASK TYPES (22 total)
 * ═══════════════════════════════════════════════════════════════
 * 
 * TAL OG ALGEBRA (10):
 * - tal_regnearter, tal_regnehierarki, tal_ligninger
 * - tal_hastighed_tid, tal_overslag, tal_algebraiske_udtryk
 * - tal_lineaere_funktioner, tal_pris_rabat_procent
 * - tal_forholdstalsregning, tal_broeker_og_antal
 * 
 * GEOMETRI OG MÅLING (8):
 * - geo_enhedsomregning, geo_vinkelsum, geo_trekant_elementer
 * - geo_ligedannethed, geo_sammensat_figur, geo_rumfang
 * - geo_transformationer, geo_projektioner
 * 
 * STATISTIK OG SANDSYNLIGHED (4):
 * - stat_soejlediagram, stat_statistiske_maal
 * - stat_boksplot, stat_sandsynlighed
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

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

import { initRegistry, getRegistry } from './registry'
import { initOpenAI } from './openai'
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

