export type LegacyDifficulty = 'easy' | 'medium' | 'hard'

export type Task = {
  id: string
  title: string
  latex: string
  parts?: string[]
  tags: string[]
  difficulty: LegacyDifficulty
  dueAt?: string
  /** Task type for categorization (e.g. stat_boksplot, tal_ligninger) */
  type?: string
}
