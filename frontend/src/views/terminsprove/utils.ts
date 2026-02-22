import type { TaskGenerationPhase } from './types'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
export const API_BASE = `${API_BASE_URL}/api/terminsprove`

export function getCategoryColor(category: string): string {
  switch (category) {
    case 'tal_og_algebra': return 'var(--color-algebra)'
    case 'geometri_og_maaling': return 'var(--color-geometri)'
    case 'statistik_og_sandsynlighed': return 'var(--color-statistik)'
    default: return 'var(--color-accent)'
  }
}

export function getDifficultyLabel(diff: string): { label: string; color: string } {
  switch (diff) {
    case 'let': return { label: 'Let', color: 'var(--color-success)' }
    case 'middel': return { label: 'Middel', color: 'var(--color-warning)' }
    case 'svær': return { label: 'Svær', color: 'var(--color-error)' }
    default: return { label: diff, color: 'var(--color-text-muted)' }
  }
}

export function getPhaseLabel(phase: TaskGenerationPhase): string {
  const p = phase.toLowerCase()
  switch (p) {
    case 'brainstorming': return 'Brainstormer'
    case 'formatting': return 'Genererer...'
    case 'validating': return 'Validerer'
    case 'visualizing': return 'Visualiserer'
    case 'complete': return 'Færdig'
    default: return phase
  }
}
