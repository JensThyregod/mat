/**
 * Training API client.
 * Calls the backend TrainingController for Bayesian skill tracking.
 * Falls back to localStorage if the backend is unavailable.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    throw new Error(`Training API ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// ── Types matching backend DTOs ───────────────────────────────

export interface SkillStateDto {
  skillId: string
  alpha: number
  beta: number
  mean: number
  totalAttempts: number
  masteryLevel: string
  danishGrade: string | null
  progressWithinLevel: number
  lastPracticed: string | null
}

export interface SkillCatalogEntry {
  skillId: string
  name: string
  category: string
  generators: string[]
}

export interface SkillsResponse {
  studentId: string
  skills: SkillStateDto[]
  skillCatalog: SkillCatalogEntry[]
}

export interface TrainingResultDto {
  skillId: string
  updatedSkill: SkillStateDto
  previousLevel: string
  newLevel: string
  levelChanged: boolean
}

export interface SkillRecommendation {
  skillId: string
  recommendedDifficulty: string
  reason: string
}

// ── API calls ─────────────────────────────────────────────────

export async function fetchSkills(studentId: string): Promise<SkillsResponse> {
  return request<SkillsResponse>(`/training/${studentId}/skills`)
}

export async function recordTrainingResult(
  studentId: string,
  skillId: string,
  difficulty: string,
  results: { isCorrect: boolean }[],
): Promise<TrainingResultDto> {
  return request<TrainingResultDto>(`/training/${studentId}/record`, {
    method: 'POST',
    body: JSON.stringify({ skillId, difficulty, results }),
  })
}

export async function recommendNextSkill(studentId: string, category?: string): Promise<SkillRecommendation> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return request<SkillRecommendation>(`/training/${studentId}/recommend${query}`)
}

export async function resetSkills(studentId: string): Promise<void> {
  await request<unknown>(`/training/${studentId}/reset`, { method: 'POST' })
}
