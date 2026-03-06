import type { GeneratedTask } from '../../generators'

export type TrainingMode = 'all' | 'tal' | 'geometri' | 'statistik'

export const TRAINING_MODES: { value: TrainingMode; label: string; desc: string; icon: string; color?: string; skillCount: number }[] = [
  { value: 'all', label: 'Blandet Træning', desc: 'Alle emner blandet sammen', icon: '✦', skillCount: 22 },
  { value: 'tal', label: 'Tal og Algebra', desc: 'Regnearter, ligninger, funktioner', icon: '∑', color: 'var(--color-algebra)', skillCount: 10 },
  { value: 'geometri', label: 'Geometri', desc: 'Figurer, vinkler, rumfang', icon: '△', color: 'var(--color-geometri)', skillCount: 8 },
  { value: 'statistik', label: 'Statistik', desc: 'Diagrammer, sandsynlighed', icon: '◔', color: 'var(--color-statistik)', skillCount: 4 },
]

export interface ActiveTask {
  skillId: string
  generatorType: string
  task: GeneratedTask
  difficulty: string
  startedAt: number
}
