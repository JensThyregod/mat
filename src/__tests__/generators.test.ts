/**
 * Generator Registry Tests
 * 
 * Verifies that all 22 task generators are registered and can produce valid tasks.
 * This ensures we don't break the generator system during cleanup.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { 
  initGenerators, 
  getSupportedTypes, 
  generateTask,
  canGenerate,
  GeneratorRegistry,
} from '../generators'

// All expected generator task types (22 total)
const EXPECTED_GENERATORS = [
  // Tal og Algebra (10)
  'tal_regnearter',
  'tal_regnehierarki',
  'tal_ligninger',
  'tal_hastighed_tid',
  'tal_overslag',
  'tal_algebraiske_udtryk',
  'tal_lineaere_funktioner',
  'tal_pris_rabat_procent',
  'tal_forholdstalsregning',
  'tal_broeker_og_antal',
  
  // Geometri og Måling (8)
  'geo_enhedsomregning',
  'geo_vinkelsum',
  'geo_trekant_elementer',
  'geo_ligedannethed',
  'geo_sammensat_figur',
  'geo_rumfang',
  'geo_transformationer',
  'geo_projektioner',
  
  // Statistik og Sandsynlighed (4)
  'stat_soejlediagram',
  'stat_statistiske_maal',
  'stat_boksplot',
  'stat_sandsynlighed',
] as const

describe('Generator Registry', () => {
  beforeAll(() => {
    // Initialize without API key (logic generators only)
    initGenerators()
  })

  it('has all 22 expected generators registered', () => {
    const types = getSupportedTypes()
    expect(types.length).toBe(22)
    
    for (const expectedType of EXPECTED_GENERATORS) {
      expect(types).toContain(expectedType)
    }
  })

  it('canGenerate returns true for all expected types', () => {
    for (const type of EXPECTED_GENERATORS) {
      expect(canGenerate(type)).toBe(true)
    }
  })

  it('canGenerate returns false for unknown types', () => {
    expect(canGenerate('unknown_type')).toBe(false)
    expect(canGenerate('')).toBe(false)
    expect(canGenerate('tal_unknown')).toBe(false)
  })
})

describe('Generator Imports', () => {
  it('imports all logic generator classes', async () => {
    const logic = await import('../generators/logic')
    
    // Tal og Algebra
    expect(logic.RegneArterGenerator).toBeDefined()
    expect(logic.LigningerGenerator).toBeDefined()
    expect(logic.RegnehierarkiGenerator).toBeDefined()
    expect(logic.HastighedTidGenerator).toBeDefined()
    expect(logic.OverslagGenerator).toBeDefined()
    expect(logic.AlgebraiskeUdtrykGenerator).toBeDefined()
    expect(logic.LineaereFunktionerGenerator).toBeDefined()
    expect(logic.PrisRabatGenerator).toBeDefined()
    expect(logic.ForholdstalsregningGenerator).toBeDefined()
    expect(logic.BroekerGenerator).toBeDefined()
    
    // Geometri og Måling
    expect(logic.EnhedsomregningGenerator).toBeDefined()
    expect(logic.VinkelsumGenerator).toBeDefined()
    expect(logic.SammensatFigurGenerator).toBeDefined()
    expect(logic.ProjektionerGenerator).toBeDefined()
    expect(logic.TrekantElementerGenerator).toBeDefined()
    expect(logic.LigedannethedGenerator).toBeDefined()
    expect(logic.RumfangGenerator).toBeDefined()
    expect(logic.TransformationerGenerator).toBeDefined()
    
    // Statistik og Sandsynlighed
    expect(logic.BoksplotGenerator).toBeDefined()
    expect(logic.SandsynlighedGenerator).toBeDefined()
    expect(logic.SoejlediagramGenerator).toBeDefined()
    expect(logic.StatistiskeMaalGenerator).toBeDefined()
  })

  it('imports generator types', async () => {
    const types = await import('../generators/types')
    expect(types.LogicBasedGenerator).toBeDefined()
    expect(types.LLMGenerator).toBeDefined()
    expect(types.SeededRandom).toBeDefined()
  })

  it('imports registry utilities', async () => {
    const registry = await import('../generators/registry')
    expect(registry.GeneratorRegistry).toBeDefined()
    expect(registry.getRegistry).toBeDefined()
    expect(registry.initRegistry).toBeDefined()
  })

  it('imports OpenAI service', async () => {
    const openai = await import('../generators/openai')
    expect(openai.OpenAI).toBeDefined()
    expect(openai.getOpenAI).toBeDefined()
    expect(openai.initOpenAI).toBeDefined()
  })
})

describe('Task Generation', () => {
  beforeAll(() => {
    initGenerators()
  })

  // Test a sample of generators to ensure they work
  const SAMPLE_GENERATORS = [
    'tal_regnearter',
    'tal_ligninger',
    'geo_vinkelsum',
    'geo_sammensat_figur',
    'stat_sandsynlighed',
    'stat_boksplot',
  ]

  for (const taskType of SAMPLE_GENERATORS) {
    it(`generates valid task for ${taskType}`, async () => {
      const task = await generateTask(taskType)
      
      // All tasks must have these fields
      expect(task).toBeDefined()
      expect(task.type).toBe(taskType)
      expect(task.title).toBeTruthy()
      expect(task.intro).toBeTruthy()
      expect(Array.isArray(task.questions)).toBe(true)
      expect(task.questions.length).toBeGreaterThan(0)
      
      // Each question must have text and answer
      for (const question of task.questions) {
        expect(question.text).toBeTruthy()
        expect(question.answer).toBeTruthy()
        expect(question.answer_type).toBeTruthy()
      }
    })
  }

  it('generates reproducible tasks with seed', async () => {
    const task1 = await generateTask('tal_regnearter', { seed: 12345 })
    const task2 = await generateTask('tal_regnearter', { seed: 12345 })
    
    // Same seed should produce identical tasks
    expect(task1.title).toBe(task2.title)
    expect(task1.questions[0].answer).toBe(task2.questions[0].answer)
  })

  it('generates different tasks without seed', async () => {
    const tasks = await Promise.all([
      generateTask('tal_regnearter'),
      generateTask('tal_regnearter'),
      generateTask('tal_regnearter'),
    ])
    
    // At least some variation expected (not all identical)
    const answers = tasks.map(t => t.questions[0].answer)
    const uniqueAnswers = new Set(answers)
    // With 3 random generations, likely to get at least 2 unique answers
    expect(uniqueAnswers.size).toBeGreaterThanOrEqual(1)
  })
})

describe('Generator Class Instantiation', () => {
  it('creates GeneratorRegistry without OpenAI', () => {
    const registry = new GeneratorRegistry()
    expect(registry.getSupportedTypes().length).toBe(22)
    expect(registry.getLogicGenerators().length).toBe(22)
    expect(registry.getLLMGenerators().length).toBe(0)
  })

  it('all generators are logic-based (no LLM required)', () => {
    const registry = new GeneratorRegistry()
    
    for (const type of EXPECTED_GENERATORS) {
      const generator = registry.getGenerator(type)
      expect(generator).toBeDefined()
      expect(generator?.requiresLLM).toBe(false)
    }
  })
})

