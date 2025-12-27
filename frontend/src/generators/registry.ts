/**
 * Generator Registry
 * 
 * Central registry for all task generators.
 * Provides factory methods to get generators by task type.
 */

import type { TaskGenerator, OpenAIService, GeneratorConfig, GeneratedTask } from './types'
import type { TaskInstance } from '../types/taskSchema'

// Logic generators
import {
  // Tal og Algebra
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
  // Geometri og Måling
  EnhedsomregningGenerator,
  VinkelsumGenerator,
  SammensatFigurGenerator,
  ProjektionerGenerator,
  TrekantElementerGenerator,
  LigedannethedGenerator,
  RumfangGenerator,
  TransformationerGenerator,
  // Statistik og Sandsynlighed
  BoksplotGenerator,
  SandsynlighedGenerator,
  SoejlediagramGenerator,
  StatistiskeMaalGenerator,
} from './logic'

// ════════════════════════════════════════════════════════════════
// REGISTRY
// ════════════════════════════════════════════════════════════════

/**
 * Generator registry - creates and manages all generators
 */
export class GeneratorRegistry {
  private readonly generators = new Map<string, TaskGenerator>()
  private readonly openai?: OpenAIService
  
  constructor(openai?: OpenAIService) {
    this.openai = openai
    this.registerAll()
  }
  
  private registerAll(): void {
    // === TAL OG ALGEBRA ===
    this.register(new RegneArterGenerator())
    this.register(new RegnehierarkiGenerator())
    this.register(new LigningerGenerator())
    this.register(new HastighedTidGenerator())
    this.register(new OverslagGenerator())
    this.register(new AlgebraiskeUdtrykGenerator())
    this.register(new LineaereFunktionerGenerator())
    this.register(new PrisRabatGenerator())
    this.register(new ForholdstalsregningGenerator())
    this.register(new BroekerGenerator())
    
    // === GEOMETRI OG MÅLING ===
    this.register(new EnhedsomregningGenerator())
    this.register(new VinkelsumGenerator())
    this.register(new TrekantElementerGenerator())
    this.register(new LigedannethedGenerator())
    this.register(new SammensatFigurGenerator())
    this.register(new RumfangGenerator())
    this.register(new TransformationerGenerator())
    this.register(new ProjektionerGenerator())
    
    // === STATISTIK OG SANDSYNLIGHED ===
    this.register(new SoejlediagramGenerator())
    this.register(new StatistiskeMaalGenerator())
    this.register(new BoksplotGenerator())
    this.register(new SandsynlighedGenerator())
  }
  
  private register(generator: TaskGenerator): void {
    this.generators.set(generator.taskType, generator)
  }
  
  /**
   * Get a generator by task type ID
   */
  getGenerator(taskType: string): TaskGenerator | undefined {
    return this.generators.get(taskType)
  }
  
  /**
   * Get all registered generators
   */
  getAllGenerators(): TaskGenerator[] {
    return Array.from(this.generators.values())
  }
  
  /**
   * Get all logic-based generators (don't require LLM)
   */
  getLogicGenerators(): TaskGenerator[] {
    return this.getAllGenerators().filter(g => !g.requiresLLM)
  }
  
  /**
   * Get all LLM-powered generators
   */
  getLLMGenerators(): TaskGenerator[] {
    return this.getAllGenerators().filter(g => g.requiresLLM)
  }
  
  /**
   * Check if a task type has a generator
   */
  hasGenerator(taskType: string): boolean {
    return this.generators.has(taskType)
  }
  
  /**
   * Get all supported task types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.generators.keys())
  }
  
  /**
   * Generate a task for a given type
   */
  async generate(taskType: string, config?: GeneratorConfig): Promise<GeneratedTask> {
    const generator = this.getGenerator(taskType)
    if (!generator) {
      throw new Error(`No generator found for task type: ${taskType}`)
    }
    
    if (generator.requiresLLM && !this.openai) {
      throw new Error(`Generator for ${taskType} requires OpenAI but no API key was provided`)
    }
    
    return generator.generate(config)
  }
  
  /**
   * Generate a task and convert to TaskInstance with ID
   */
  async generateTaskInstance(
    taskType: string, 
    config?: GeneratorConfig
  ): Promise<TaskInstance> {
    const generated = await this.generate(taskType, config)
    
    // Generate unique ID
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    const id = `${taskType}_gen_${timestamp}_${random}`
    
    return {
      id,
      type: generated.type,
      title: generated.title,
      intro: generated.intro,
      figure: generated.figure,
      questions: generated.questions,
      variables: generated.variables,
    }
  }
  
  /**
   * Generate multiple tasks of a given type
   */
  async generateBatch(
    taskType: string,
    count: number,
    config?: GeneratorConfig
  ): Promise<TaskInstance[]> {
    const tasks: TaskInstance[] = []
    
    for (let i = 0; i < count; i++) {
      const task = await this.generateTaskInstance(taskType, {
        ...config,
        seed: config?.seed ? config.seed + i : undefined,
      })
      tasks.push(task)
    }
    
    return tasks
  }
}

// ════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ════════════════════════════════════════════════════════════════

let registryInstance: GeneratorRegistry | null = null

/**
 * Get the global generator registry
 */
export function getRegistry(openai?: OpenAIService): GeneratorRegistry {
  if (!registryInstance) {
    registryInstance = new GeneratorRegistry(openai)
  }
  return registryInstance
}

/**
 * Initialize registry with OpenAI service
 */
export function initRegistry(openai: OpenAIService): GeneratorRegistry {
  registryInstance = new GeneratorRegistry(openai)
  return registryInstance
}

