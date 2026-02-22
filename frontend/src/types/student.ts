export type Student = {
  id: string
  name: string
  code: string
}

export type AnswerRecord = {
  taskId: string
  studentId: string
  answer: string
  updatedAt: string
  partIndex?: number
  partCount?: number
}

export type QuestionAnswerState = {
  answer: string
  validated: boolean
  status: 'neutral' | 'correct' | 'incorrect'
  updatedAt: string
}

export type TaskSetState = {
  taskId: string
  studentId: string
  parts: Record<number, Record<number, QuestionAnswerState>>
  updatedAt: string
}
