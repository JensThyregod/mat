/**
 * Training API client.
 * Calls the backend TrainingController for Bayesian skill tracking.
 * Uses the /me/ pattern — identity is derived from the JWT token server-side.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

let _accessToken: string | null = null

export function setTrainingApiToken(token: string | null) {
  _accessToken = token
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...init,
  })
  if (!res.ok) {
    throw new Error(`Training API ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

// Types matching backend DTOs

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

// API calls

export async function fetchSkills(): Promise<SkillsResponse> {
  return request<SkillsResponse>('/training/me/skills')
}

export async function recordTrainingResult(
  skillId: string,
  difficulty: string,
  results: { isCorrect: boolean }[],
): Promise<TrainingResultDto> {
  return request<TrainingResultDto>('/training/me/record', {
    method: 'POST',
    body: JSON.stringify({ skillId, difficulty, results }),
  })
}

export async function recommendNextSkill(category?: string): Promise<SkillRecommendation> {
  const query = category ? `?category=${encodeURIComponent(category)}` : ''
  return request<SkillRecommendation>(`/training/me/recommend${query}`)
}

export async function resetSkills(): Promise<void> {
  await request<unknown>('/training/me/reset', { method: 'POST' })
}
