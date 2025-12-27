export type Difficulty = 'easy' | 'medium' | 'hard'

// Legacy Task type for backwards compatibility
export type Task = {
  id: string
  title: string
  latex: string
  parts?: string[] // hvis et sæt består af flere delopgaver
  tags: string[]
  difficulty: Difficulty
  dueAt?: string
}

// Re-export new YAML-based types
export type {
  TaskInstance,
  TaskTypeDefinition,
  TaskFigure,
  Question,
  ParsedTaskInstance,
  TaskSet,
} from './types/taskSchema'

export type AnswerRecord = {
  taskId: string
  studentId: string
  answer: string
  updatedAt: string
  partIndex?: number
  partCount?: number
}

// Per-question answer state with validation
export type QuestionAnswerState = {
  answer: string
  validated: boolean  // Has the student left the field?
  status: 'neutral' | 'correct' | 'incorrect'
  updatedAt: string
}

// State for an entire task set (stored in e.g. set1.state.json)
export type TaskSetState = {
  taskId: string
  studentId: string
  // Answers indexed by: partIndex -> questionIndex -> state
  parts: Record<number, Record<number, QuestionAnswerState>>
  updatedAt: string
}

export type Student = {
  id: string
  name: string
  code: string
}

