/**
 * Frontend Bayesian Practice Engine
 *
 * Implements a simplified version of the backend scoring engine for
 * client-side adaptive task selection. State persists in localStorage.
 *
 * This mirrors the logic from MatBackend.Core/Scoring/BayesianScoringEngine.cs
 * but runs entirely in the browser for instant feedback.
 */

import { SKILL_GENERATOR_MAP, type SkillGeneratorMapping } from './skillMap'
import { generateTask, initGenerators, type GeneratedTask } from '../generators'

// ── Types ─────────────────────────────────────────────────────

export interface BetaState {
  alpha: number
  beta: number
}

export interface SkillState {
  skillId: string
  dist: BetaState
  totalAttempts: number
  correctCount: number
  lastPracticed: number | null
}

export interface PracticeState {
  skills: Record<string, SkillState>
  totalTasksCompleted: number
  sessionStarted: number
}

export type MasteryLevel =
  | 'not_assessed'
  | 'not_started'
  | 'beginning'
  | 'developing'
  | 'competent'
  | 'proficient'
  | 'mastered'

export interface ActiveTask {
  skillId: string
  generatorType: string
  task: GeneratedTask
  startedAt: number
}

// ── Constants ─────────────────────────────────────────────────

const STORAGE_KEY = 'mat_practice_state'
const MAX_EVIDENCE = 30
const MIN_ATTEMPTS_FOR_LEVEL = 3
const DIFFICULTY_WEIGHT_MIN = 0.5
const DIFFICULTY_WEIGHT_MAX = 1.0
const MAX_DIFFICULTY = 5.0

// ── Beta math ─────────────────────────────────────────────────

function betaMean(s: BetaState): number {
  return s.alpha / (s.alpha + s.beta)
}

function betaTotal(s: BetaState): number {
  return s.alpha + s.beta
}

function rescaleIfNeeded(s: BetaState): BetaState {
  const total = betaTotal(s)
  if (total <= MAX_EVIDENCE) return s
  const scale = MAX_EVIDENCE / total
  return {
    alpha: Math.max(0.001, 1 + (s.alpha - 1) * scale),
    beta: Math.max(0.001, 1 + (s.beta - 1) * scale),
  }
}

// ── Weight functions (asymmetric difficulty) ──────────────────

function weightCorrect(difficulty: number): number {
  const norm = Math.min(Math.max(difficulty / MAX_DIFFICULTY, 0), 1)
  return DIFFICULTY_WEIGHT_MIN + (DIFFICULTY_WEIGHT_MAX - DIFFICULTY_WEIGHT_MIN) * norm
}

function weightIncorrect(difficulty: number): number {
  const norm = Math.min(Math.max(difficulty / MAX_DIFFICULTY, 0), 1)
  return DIFFICULTY_WEIGHT_MAX - (DIFFICULTY_WEIGHT_MAX - DIFFICULTY_WEIGHT_MIN) * norm
}

// ── Mastery mapping ───────────────────────────────────────────

export function getMasteryLevel(skill: SkillState): MasteryLevel {
  if (skill.totalAttempts < MIN_ATTEMPTS_FOR_LEVEL) return 'not_assessed'
  const mean = betaMean(skill.dist)
  if (mean < 0.15) return 'not_started'
  if (mean < 0.35) return 'beginning'
  if (mean < 0.55) return 'developing'
  if (mean < 0.75) return 'competent'
  if (mean < 0.90) return 'proficient'
  return 'mastered'
}

export function getMasteryLabel(level: MasteryLevel): string {
  switch (level) {
    case 'not_assessed': return 'Ikke vurderet'
    case 'not_started': return 'Ikke startet'
    case 'beginning': return 'Begynder'
    case 'developing': return 'Udvikler sig'
    case 'competent': return 'Kompetent'
    case 'proficient': return 'Dygtig'
    case 'mastered': return 'Mestret'
  }
}

export function getMasteryColor(level: MasteryLevel): string {
  switch (level) {
    case 'not_assessed': return 'var(--color-text-tertiary, #888)'
    case 'not_started': return '#ef4444'
    case 'beginning': return '#f97316'
    case 'developing': return '#eab308'
    case 'competent': return '#22c55e'
    case 'proficient': return '#3b82f6'
    case 'mastered': return '#8b5cf6'
  }
}

export function getSkillMean(skill: SkillState): number {
  return betaMean(skill.dist)
}

// ── Difficulty mapping ────────────────────────────────────────

function meanToDifficulty(mean: number): 'let' | 'middel' | 'svaer' {
  if (mean < 0.35) return 'let'
  if (mean < 0.70) return 'middel'
  return 'svaer'
}

function difficultyToNumeric(d: 'let' | 'middel' | 'svaer'): number {
  switch (d) {
    case 'let': return 1
    case 'middel': return 3
    case 'svaer': return 5
  }
}

// ── State persistence ─────────────────────────────────────────

function loadState(): PracticeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PracticeState
  } catch { /* ignore corrupt state */ }
  return createFreshState()
}

function saveState(state: PracticeState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function createFreshState(): PracticeState {
  const skills: Record<string, SkillState> = {}
  for (const mapping of SKILL_GENERATOR_MAP) {
    skills[mapping.skillId] = {
      skillId: mapping.skillId,
      dist: { alpha: 1, beta: 1 },
      totalAttempts: 0,
      correctCount: 0,
      lastPracticed: null,
    }
  }
  return { skills, totalTasksCompleted: 0, sessionStarted: Date.now() }
}

// ── Thompson Sampling for skill selection ─────────────────────

function sampleBeta(alpha: number, beta: number): number {
  // Approximation using the Joehnk method for small alpha/beta
  // For production, a proper Beta sampler would be better, but this works well enough
  const u = joehnkBeta(alpha, beta)
  return u
}

function joehnkBeta(a: number, b: number): number {
  // Use the gamma-based method for better accuracy
  const x = gammaVariate(a)
  const y = gammaVariate(b)
  return x / (x + y)
}

function gammaVariate(shape: number): number {
  // Marsaglia and Tsang's method for shape >= 1
  if (shape < 1) {
    return gammaVariate(shape + 1) * Math.pow(Math.random(), 1 / shape)
  }
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  while (true) {
    let x: number, v: number
    do {
      x = randn()
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = Math.random()
    if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

function randn(): number {
  // Box-Muller transform
  const u1 = Math.random()
  const u2 = Math.random()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// ── The Practice Engine ───────────────────────────────────────

export class PracticeEngine {
  private state: PracticeState

  constructor() {
    initGenerators()
    this.state = loadState()
  }

  getState(): PracticeState {
    return this.state
  }

  getSkillState(skillId: string): SkillState {
    return this.state.skills[skillId] ?? {
      skillId,
      dist: { alpha: 1, beta: 1 },
      totalAttempts: 0,
      correctCount: 0,
      lastPracticed: null,
    }
  }

  getAllSkills(): SkillState[] {
    return Object.values(this.state.skills)
  }

  getSkillMapping(skillId: string): SkillGeneratorMapping | undefined {
    return SKILL_GENERATOR_MAP.find(s => s.skillId === skillId)
  }

  /**
   * Select the next skill to practice using Thompson Sampling.
   * Skills with lower mastery and higher uncertainty are more likely to be chosen.
   */
  selectNextSkill(): SkillGeneratorMapping {
    let bestSkill: SkillGeneratorMapping = SKILL_GENERATOR_MAP[0]
    let bestScore = -Infinity

    for (const mapping of SKILL_GENERATOR_MAP) {
      const skill = this.state.skills[mapping.skillId]
      if (!skill) continue

      const sampled = sampleBeta(skill.dist.alpha, skill.dist.beta)
      // 1 - sampled: lower mastery = higher priority
      const score = 1 - sampled

      if (score > bestScore) {
        bestScore = score
        bestSkill = mapping
      }
    }

    return bestSkill
  }

  /**
   * Generate a task for the selected skill, with difficulty matched to current mastery.
   */
  async generateTaskForSkill(skillId: string): Promise<ActiveTask> {
    const mapping = SKILL_GENERATOR_MAP.find(s => s.skillId === skillId)
    if (!mapping) throw new Error(`Unknown skill: ${skillId}`)

    const skill = this.state.skills[skillId]
    const mean = skill ? betaMean(skill.dist) : 0.5
    const difficulty = meanToDifficulty(mean)

    const generatorType = mapping.generators[Math.floor(Math.random() * mapping.generators.length)]
    const task = await generateTask(generatorType, { difficulty })

    return { skillId, generatorType, task, startedAt: Date.now() }
  }

  /**
   * Generate the next recommended task using Thompson Sampling.
   */
  async generateNextTask(): Promise<ActiveTask> {
    const skill = this.selectNextSkill()
    return this.generateTaskForSkill(skill.skillId)
  }

  /**
   * Record the result of answering a question and update the skill state.
   * Returns the updated skill state.
   */
  recordAnswer(skillId: string, isCorrect: boolean, difficulty: 'let' | 'middel' | 'svaer'): SkillState {
    const skill = this.state.skills[skillId]
    if (!skill) throw new Error(`Unknown skill: ${skillId}`)

    const numDifficulty = difficultyToNumeric(difficulty)
    const weight = isCorrect
      ? weightCorrect(numDifficulty)
      : weightIncorrect(numDifficulty)

    if (isCorrect) {
      skill.dist.alpha += weight
      skill.correctCount++
    } else {
      skill.dist.beta += weight
    }

    skill.dist = rescaleIfNeeded(skill.dist)
    skill.totalAttempts++
    skill.lastPracticed = Date.now()

    saveState(this.state)
    return { ...skill }
  }

  /**
   * Record results for all questions in a task at once.
   */
  recordTaskResults(
    skillId: string,
    results: { isCorrect: boolean }[],
    difficulty: 'let' | 'middel' | 'svaer'
  ): SkillState {
    let updated: SkillState | null = null
    for (const r of results) {
      updated = this.recordAnswer(skillId, r.isCorrect, difficulty)
    }
    this.state.totalTasksCompleted++
    saveState(this.state)
    return updated ?? this.getSkillState(skillId)
  }

  resetAll(): void {
    this.state = createFreshState()
    saveState(this.state)
  }
}
