export type LegacyDifficulty = 'easy' | 'medium' | 'hard'

export type Task = {
  id: string
  title: string
  latex: string
  parts?: string[]
  tags: string[]
  difficulty: LegacyDifficulty
  dueAt?: string
}
